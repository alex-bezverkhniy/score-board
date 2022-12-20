import { h } from "preact";
import { useContext, useState } from "preact/hooks";
import { baseUrl, ScoreDataContext } from "../common";

export function AddTaskForm(props) {
    const [value, setValue] = useState("");
    const [hasError, setHasError] = useState(false);
    const { scoreData, fetchScoreData } = useContext(ScoreDataContext);

    const isInt = (value) => {
        return !isNaN(value) && 
                parseInt(Number(value)) == value && 
                !isNaN(parseInt(value, 10));
    }

    const onSubmit = e => {
        console.log("AddTask", value);

        if (value) {
            const i = value.indexOf(' ');            
            if ( !isInt(value.substring(0, i))) {
                setHasError(true);
                return;
            }
            const points = parseInt(value.substring(0, i));
            const task = value.substring(i+1);
            console.log(`add new points: "${points}", task: "${task}"`);
            if ( isNaN(points)) {
                setHasError(true)
            } else {
                const score = {
                    points: points,
                    task: task
                }
                fetch(baseUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(score)
                }).then((d) => {
                    fetchScoreData();
                    setHasError(false);
                    setValue('');
                })
            }

        } else {
            setHasError(true);
        }

        fetchScoreData();
        e.preventDefault();
    }
    const onInput = (e) => {
        setValue(e.target.value)
    }
    const onClean = (e) => {
        setValue('');        
        e.preventDefault();        
    }

    return (
<div class={hasError ? "form-group has-error" : "form-group"}>
    <div class="input-group">
        <span class="input-group-addon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"
                class="bi bi-journal-check" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M10.854 6.146a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 1 1 .708-.708L7.5 8.793l2.646-2.647a.5.5 0 0 1 .708 0z" />
                <path d="M3 0h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-1h1v1a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v1H1V2a2 2 0 0 1 2-2z" />
                <path d="M1 5v-.5a.5.5 0 0 1 1 0V5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0V8h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1zm0 3v-.5a.5.5 0 0 1 1 0v.5h.5a.5.5 0 0 1 0 1h-2a.5.5 0 0 1 0-1H1z" />
            </svg>
        </span>
        <input type="text" value={value} onInput={onInput}class="form-input" placeholder="..."/>    
        <button onClick={onClean} class="btn input-group-btn" title="Clean task">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-backspace" viewBox="0 0 16 16">
            <path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z"/>
            <path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1h7.08zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-7.08z"/>
          </svg>
        </button>  
        <button onClick={onSubmit}  class="btn btn-primary input-group-btn" title="Add new task">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-save" viewBox="0 0 16 16">
            <path d="M2 1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H9.5a1 1 0 0 0-1 1v7.293l2.646-2.647a.5.5 0 0 1 .708.708l-3.5 3.5a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L7.5 9.293V2a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h2.5a.5.5 0 0 1 0 1H2z"/>
          </svg>
        </button>
    </div>
    <p class={!hasError ? "form-input-hint d-hide" : "form-input-hint"}>Please use next format: [points] [task description]</p>
</div>
)
}