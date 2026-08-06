import { FC, useState, useEffect } from 'react'
import avatar from '../assets/avatar.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faImage } from '@fortawesome/free-solid-svg-icons'
import { useForm } from 'react-hook-form';


interface FormData {
    email: string;
    password: string;
    photo: FileList;
}

const RegistrationForm: FC = () => {
    const { register, handleSubmit, watch } = useForm<FormData>();
    const [photo] = watch(["photo"]);
    const [imgUrl, setImgUrl] = useState<string | null>(null);
    const hiddenFileInput: { current: HTMLInputElement | null } = { current: null };
    const { ref, ...rest } = register("photo");

    const onRegister = (formData: FormData) => {
        console.log(formData);
    }

    useEffect(() => {
        console.log("photo useEffect", photo);
        if (photo && photo[0]) {
            console.log("photo useEffect", photo);
            const newUrl = URL.createObjectURL(photo[0]);
            setImgUrl(newUrl);
            console.log("photo selected", newUrl);
        }
    }, [photo])

    return (
        <form onSubmit={handleSubmit(onRegister)}>
            <div className='vstack gap-2 col-md-6 mx-auto'>
                <h1 className='d-flex justify-content-center'>Registration Form</h1>
                <div className='d-flex justify-content-center position-relative'>
                    <div style={{ width: '200px', height: '200px' }}>
                        {imgUrl ? <img src={imgUrl} alt="Preview" className='img-fluid' /> :
                            <img src={avatar} alt="Preview" className='img-fluid' />}
                    </div>
                    <div className='position-absolute bottom-0 end-0'>
                        <FontAwesomeIcon icon={faImage} className="fa-xl"
                            onClick={() => { hiddenFileInput.current?.click() }} />
                    </div>
                </div>
                <input {...rest} ref={(e) => { ref(e); hiddenFileInput.current = e }} type="file" id="photo" name="photo" accept="image/png, image/jpeg"
                    style={{ display: 'none' }}
                />
                <label htmlFor="email:">Email</label>
                <input {...register("email")} type="email" id="email" name="email" />
                <label htmlFor="password:">Password</label>
                <input {...register("password")} type="password" id="password" name="password" />
                <button className='btn btn-outline-secondary' type="submit">Register</button>
            </div >
        </form>
    )
}

export default RegistrationForm