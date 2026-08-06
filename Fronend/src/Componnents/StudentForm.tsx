import { zodResolver } from '@hookform/resolvers/zod';
import { FC } from 'react';
import { useForm } from "react-hook-form"
import { z } from 'zod';

const StudentSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters long'),
    age: z.number({ invalid_type_error: 'Age is requiered' }).min(18, 'Age must be at least 18 years old')
})

type FormData = z.infer<typeof StudentSchema>;

const StudentForm: FC = () => {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(StudentSchema) });

    const onSubmit = (data: FormData) => {
        console.log(data);
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div className='m-3'>
                <label htmlFor='name' className='form-label'>Name</label>
                <input {...register('name')} type='text' className='form-control' id='name' />
                {errors.name && <p className='text-danger'>{errors.name.message}</p>}
            </div>
            <div className='m-3'>
                <label htmlFor='age' className='form-label'>Age</label>
                <input {...register('age', { valueAsNumber: true })} type='number' className='form-control' id='age' />
                {errors.age && <p className='text-danger'>{errors.age.message}</p>}
            </div>
            <button type='submit' className='btn btn-primary m-3'>Submit</button>
        </form>

    )
}

export default StudentForm