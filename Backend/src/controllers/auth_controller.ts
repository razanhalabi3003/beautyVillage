import { Request, Response, NextFunction } from 'express';
import userModel from '../models/user_model';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRole } from '../types/express';

const register = async (req: Request, res: Response) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    if (!name || !email || !password) {
        res.status(400).send("missing name, email or password");
        return;
    }
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // role is always hardcoded to "customer" here - never read from the
        // request body, so a client can never register as businessOwner/admin.
        const user = await userModel.create({
            name: name,
            email: email,
            password: hashedPassword,
            role: "customer",
        });
        res.status(201).send({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (err) {
        res.status(400).send(err);
    }
};

const generateTokens = (_id: string): { accessToken: string, refreshToken: string } | null => {
    const random = Math.floor(Math.random() * 1000000);
    if (!process.env.TOKEN_SECRET) {
        return null;
    }
    const accessToken = jwt.sign(
        {
            _id: _id,
            random: random
        },
        process.env.TOKEN_SECRET,
        { expiresIn: process.env.TOKEN_EXPIRATION });

    const refreshToken = jwt.sign(
        {
            _id: _id,
            random: random
        },
        process.env.TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION });

    return { accessToken, refreshToken };
}

const login = async (req: Request, res: Response) => {
    const email = req.body.email;
    const password = req.body.password;
    if (!email || !password) {
        res.status(400).send("wrong email or password");
        return;
    }
    try {
        const user = await userModel.findOne({ email: email });
        if (!user) {
            res.status(400).send("wrong email or password");
            return;
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            res.status(400).send("wrong email or password");
            return;
        }
        // A missing legacy isActive field is treated as active - only an
        // explicit false blocks login.
        if (user.isActive === false) {
            res.status(403).send("account is suspended");
            return;
        }

        //TODO: generate access token§
        const userId: string = user._id.toString();
        const tokens = generateTokens(userId);
        if (!tokens) {
            res.status(400).send("missing auth configuration");
            return;
        }

        if (user.refreshTokens == null) {
            user.refreshTokens = [];
        }
        user.refreshTokens.push(tokens.refreshToken);
        await user.save();
        // Only safe fields are ever returned - never password or refreshTokens.
        res.status(200).send({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
        });
    } catch (err) {
        res.status(400);
    }
};

const logout = async (req: Request, res: Response) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        res.status(400).send("missing refresh token");
        return;
    }
    //first validate the refresh token
    if (!process.env.TOKEN_SECRET) {
        res.status(400).send("missing auth configuration");
        return;
    }
    jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err: any, data: any) => {
        if (err) {
            res.status(403).send("invalid token");
            return;
        }
        const payload = data as TokenPayload;
        try {
            const user = await userModel.findOne({ _id: payload._id });
            if (!user) {
                res.status(400).send("invalid token");
                return;
            }
            if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
                res.status(400).send("invalid token");
                user.refreshTokens = [];
                await user.save();
                return;
            }
            const tokens = user.refreshTokens.filter((token) => token !== refreshToken);
            user.refreshTokens = tokens;
            await user.save();
            res.status(200).send("logged out");
        } catch (err) {
            res.status(400).send("invalid token");
        }
    });
};

const refresh = async (req: Request, res: Response) => {
    //first validate the refresh token
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        res.status(400).send("invalid token");
        return;
    }
    if (!process.env.TOKEN_SECRET) {
        res.status(400).send("missing auth configuration");
        return;
    }
    jwt.verify(refreshToken, process.env.TOKEN_SECRET, async (err: any, data: any) => {
        if (err) {
            res.status(403).send("invalid token");
            return;
        }
        //find the user
        const payload = data as TokenPayload;
        try {
            // The refresh token only identifies the user id; the current
            // database record is always re-fetched here so a suspension
            // takes effect immediately, even for a still-valid refresh token.
            const user = await userModel.findOne({ _id: payload._id });
            if (!user) {
                res.status(401).send("user not found");
                return;
            }
            // A missing legacy isActive field is treated as active - only an
            // explicit false blocks refresh.
            if (user.isActive === false) {
                res.status(403).send("account is suspended");
                return;
            }
            //check that the token exists in the user
            if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
                user.refreshTokens = [];
                await user.save();
                res.status(400).send("invalid token");
                return;
            }
            //generate a new access token
            const newTokens = generateTokens(user._id.toString());
            if (!newTokens) {
                user.refreshTokens = [];
                await user.save();
                res.status(400).send("missing auth configuration");
                return;
            }

            //delete the old refresh token
            user.refreshTokens = user.refreshTokens.filter((token) => token !== refreshToken);
            //save the new refresh token in the user
            user.refreshTokens.push(newTokens.refreshToken);
            await user.save();

            //return the new access token and the new refresh token
            res.status(200).send({
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
            });
        } catch (err) {
            res.status(400).send("invalid token");
        }
    });

};

const me = async (req: Request, res: Response) => {
    if (!req.user) {
        res.status(401).send("unauthorized");
        return;
    }
    const user = await userModel.findById(req.user.id).select("-password -refreshTokens");
    if (!user) {
        res.status(401).send("user not found");
        return;
    }
    res.status(200).send(user);
};


type TokenPayload = {
    _id: string;
};
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        res.status(401).send("missing token");
        return;
    }
    if (!process.env.TOKEN_SECRET) {
        res.status(400).send("missing auth configuration");
        return;
    }
    jwt.verify(token, process.env.TOKEN_SECRET, async (err, data) => {
        if (err) {
            res.status(403).send("invalid token");
            return;
        }
        // The token is only used to identify the user id. Role and active
        // status are always re-read from the database below, never trusted
        // from the token itself, so a suspension or role change takes effect
        // on the very next request even if an old token is still valid.
        const payload = data as TokenPayload;
        try {
            const user = await userModel.findById(payload._id).select("role isActive");
            if (!user) {
                res.status(401).send("user not found");
                return;
            }
            if (user.isActive === false) {
                res.status(403).send("account is suspended");
                return;
            }
            req.user = {
                id: user._id.toString(),
                // Legacy users saved before "role" existed default safely to customer.
                role: (user.role as UserRole) || "customer",
            };
            next();
        } catch (error) {
            next(error);
        }
    });
};

export default { register, login, logout, refresh, me };