import { h } from "preact";
import { useContext, useState } from "preact/hooks";
import { baseUrl, ScoreDataContext, toUnixTimestamp } from "../common";

export function FilterForm(props) {
    const currectDateTime = () => {
        const str = new Date(new Date().toString().split('GMT')[0] + ' UTC').toISOString().split('.')[0];
        return str.substring(0, str.length - 3);
    }
    const [value, setValue] = useState(currectDateTime())

    const { scoreData, fetchScoreData } = useContext(ScoreDataContext);

    const onSubmit = (e) => {
        // console.log('filter submit', value);
        const unixTime = toUnixTimestamp(value);
        fetchScoreData(`${baseUrl}/${unixTime}`);
        e.preventDefault();
    }
    const onInput = (e) => {
        setValue(e.target.value)
    }

    const onClean = (e) => {
        console.log('time', currectDateTime());
        setValue('');
        fetchScoreData(baseUrl);
        e.preventDefault();
    }

    return (
        <div class="input-group">
            <span class="input-group-addon">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-funnel" viewBox="0 0 16 16">
                    <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5v-2zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2h-11z" />
                </svg>
            </span>
            <input type="datetime-local" value={value} class="form-input" onInput={onInput} />
            <button onClick={onClean} class="btn input-group-btn" title="Clean filter">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-backspace" viewBox="0 0 16 16">
                    <path d="M5.83 5.146a.5.5 0 0 0 0 .708L7.975 8l-2.147 2.146a.5.5 0 0 0 .707.708l2.147-2.147 2.146 2.147a.5.5 0 0 0 .707-.708L9.39 8l2.146-2.146a.5.5 0 0 0-.707-.708L8.683 7.293 6.536 5.146a.5.5 0 0 0-.707 0z" />
                    <path d="M13.683 1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7.08a2 2 0 0 1-1.519-.698L.241 8.65a1 1 0 0 1 0-1.302L5.084 1.7A2 2 0 0 1 6.603 1h7.08zm-7.08 1a1 1 0 0 0-.76.35L1 8l4.844 5.65a1 1 0 0 0 .759.35h7.08a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-7.08z" />
                </svg>
            </button>
            <button onClick={onSubmit} class="btn btn-primary input-group-btn" title="Search">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-search" viewBox="0 0 16 16">
                    <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
                </svg>
            </button>
        </div>)
}