import { h } from "preact";
import { useContext } from "preact/hooks";
import { ScoreDataContext } from "../common";

export function Navigation() {
    const {calType, useCalType} = useContext(ScoreDataContext);

    const onAll = (e) => {
        useCalType('all');
        e.preventDefault();
    }

    const onMonth = (e) => {
        useCalType('month');
        e.preventDefault();
    }

    const onWeek = (e) => {
        useCalType('week');
        e.preventDefault();
    }

    const onToday = (e) => {
        useCalType('today');
        e.preventDefault();
    }

    const isActive = (val) => {
        console.log(val, calType);
        return calType != val ? 'btn-link' : 'btn-primary';
    }

    return (
    <section class="navbar-section">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-award"
            viewBox="0 0 16 16">
                <path
                    d="M9.669.864 8 0 6.331.864l-1.858.282-.842 1.68-1.337 1.32L2.6 6l-.306 1.854 1.337 1.32.842 1.68 1.858.282L8 12l1.669-.864 1.858-.282.842-1.68 1.337-1.32L13.4 6l.306-1.854-1.337-1.32-.842-1.68L9.669.864zm1.196 1.193.684 1.365 1.086 1.072L12.387 6l.248 1.506-1.086 1.072-.684 1.365-1.51.229L8 10.874l-1.355-.702-1.51-.229-.684-1.365-1.086-1.072L3.614 6l-.25-1.506 1.087-1.072.684-1.365 1.51-.229L8 1.126l1.356.702 1.509.229z" />
                <path d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1 4 11.794z" />
            </svg>
            <a href="#" class="navbar-brand mr-2 hide-sm">Score Board</a>
            <a href="#" class={`btn ${isActive('all')}`} onClick={onAll}>All</a>
            <a href="#" class={`btn ${isActive('month')}`} onClick={onMonth}>Month</a>
            <a href="#" class={`btn ${isActive('week')}`}onClick={onWeek}>Week</a>
            <a href="#" class={`btn ${isActive('today')}`} onClick={onToday}>Today</a>
    </section>
        );
}