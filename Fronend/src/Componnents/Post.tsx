
function Post() {
    const title = "Post Title param 22"

    const getTitle = () => {
        return title
    }
    return (
        <div>
            <h2>{getTitle()}</h2>
            <p>Post Description</p>
        </div>
    )
}

export default Post
