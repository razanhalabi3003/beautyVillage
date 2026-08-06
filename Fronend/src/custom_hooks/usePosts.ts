
import { useEffect, useState } from 'react';
import postService, { CanceledError, Post } from '../services/post-service';

const usePosts = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    useEffect(() => {
        console.log('useEffect');
        setIsLoading(true);
        const { request, abort } = postService.getAllPosts()
        request.then((response) => {
            setPosts(response.data);
            setIsLoading(false);
        }).catch((error) => {
            if (!(error instanceof CanceledError)) {
                setError(error.message);
                setIsLoading(false);
            }
        });
        return abort;
    }, [])

    return { posts, setPosts, error, setError, isLoading, setIsLoading }
}

export default usePosts;