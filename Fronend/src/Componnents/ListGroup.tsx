import { FC, useState } from 'react';
import listStyle from './ListGroup.module.css';

interface ListGroupProps {
    title: string,
    items: string[],
    onDelete: (index: number) => void
}

const ListGroup: FC<ListGroupProps> = ({ title, items, onDelete }) => {
    const [selectedItem, setSelectedItem] = useState(0);
    if (selectedItem >= items.length) {
        setSelectedItem(items.length - 1)
    }
    const handleClick = (index: number) => {
        console.log("You clicked on item ", index)
        setSelectedItem(index)
    }

    const deleteItem = () => {
        console.log("You clicked on delete")
        onDelete(selectedItem);
    }

    return (
        <div className={listStyle.listContainer}>
            <h1>{title}</h1>
            < ul className="list-group" >
                {items.map((item, index) => {
                    return <li
                        className={selectedItem != index ? "list-group-item" : "list-group-item active"}
                        key={index}
                        onClick={() => { handleClick(index) }}
                    >
                        {index} {item}
                    </li>
                })}
            </ul >
            <button onClick={deleteItem} className='btn btn-primary'>Delete</button>
            {items.length == 1 &&
                <div className="alert alert-primary" role="alert">
                    Last Item Alert!
                </div>
            }
        </div>
    )
}

export default ListGroup;