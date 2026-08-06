import request from "supertest";
import initApp from "../server";
import mongoose from "mongoose";
// import commentsModel from "../models/posts_model";
import { Express } from "express";

let app: Express;

type UserInfo = {
  name: string;
  email: string;
  password: string;
  token?: string;
};
const commentsUserInfo: UserInfo = {
  name: "Comments Test User",
  email: "comments_test_user@gmail.com",
  password: "123456",
};

beforeAll(async () => {
  console.log("init app");
  app = await initApp();
  console.log("init app finished");
  // await commentsModel.deleteMany();
  console.log("delete all posts");
  // register may fail if this user already exists from a previous run - that's fine, login still works
  await request(app).post("/auth/register").send(commentsUserInfo);
  const response = await request(app).post("/auth/login").send({
    email: commentsUserInfo.email,
    password: commentsUserInfo.password
  });
  commentsUserInfo.token = response.body.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

let commentId = "";

const testComment1 = {
  owner: "Eliav",
  comment: "My First post",
  postId: "This is my first post",
};

const testComment2 = {
  owner: "Eliav2",
  comment: "My First post 2",
  postId: "This is my first post 2",
};

const testCommentFail = {
  comment: "My First post 2",
  postId: "This is my first post 2",
};

describe("Comments Tests", () => {
  test("Comments Get All coimments", async () => {
    const response = await request(app).get("/comments");
    console.log(response.body);
    expect(response.statusCode).toBe(200);
  });

  test("Comment Create test", async () => {
    const response = await request(app).post("/comments")
      .set("authorization", "JWT " + commentsUserInfo.token)
      .send(testComment1);
    console.log(response.body);
    const comment = response.body;
    expect(response.statusCode).toBe(201);
    expect(comment.owner).toBe(testComment1.owner);
    expect(comment.comment).toBe(testComment1.comment);
    expect(comment.postId).toBe(testComment1.postId);
    commentId = comment._id;
  });

});
