import { FC } from 'react';
import ListGroup from './ListGroup';
import usePosts from '../custom_hooks/usePosts';

const PostsList: FC = () => {
    const { posts, isLoading, error } = usePosts();

    return (
        <div>
            {isLoading == true && <p>Loading items...</p>}
            {error ? <p>Loding items failed with error: {error}</p > :
                <ListGroup title='Posts List' items={posts.map(post => post.title)} onDelete={() => { }} />
            }
        </div>
    )
}

export default PostsList
