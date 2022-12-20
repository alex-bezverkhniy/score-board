import { h } from "preact";
import { useContext, useState } from "preact/hooks";
import { ScoreDataContext, toUnixTimestamp } from "../common";
import { DeleteDlg } from "./DeleteDlg";

export function TasksLog (props) {        
    const [key, setKey] = useState('');
    const { selectKey} = useContext(ScoreDataContext);    

    const onDelete = (e) => {    
        const k = e.target.dataset.key
        console.log('delete', k);
        selectKey(k);        
        e.preventDefault()
    }


  return (
<div class="panel with-v-scroll">
<table class="table">
    <thead>
        <tr>
            <th>points</th>
            <th>task <span class="chip" title="tasks displayed">{props.tasks.length}</span></th>
            <th>date</th>
            <th>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x-circle" viewBox="0 0 16 16">
                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
            </th>
        </tr>
    </thead>
    <tbody>
        {props.tasks.map((task, k) => (
        <tr>
            <td>
              <span class="chip">{task.points}</span>
            </td>
            <td>
                <span class="hide-sm" title={task.task}>{task.task}</span>                
                <p class="show-sm" title={task.task}>{task.task}</p>
            </td>
            <td style="min-width: 8rem;">{task.added_at.replace("T", " ").replace("-06:00", "")}</td>
            <td>                
              <a href="#" title="delete task" data-key={toUnixTimestamp(task.added_at)} class="btn-sm btn-action s-circle" onClick={onDelete}>x</a>
            </td>
        </tr>)
        )}
    </tbody>
</table>
<DeleteDlg show={selectKey != ''}></DeleteDlg>
</div>)
}