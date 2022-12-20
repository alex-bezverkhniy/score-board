import { h } from "preact";
import './status-bage.css'

export function StatusBage(props) {
    var todaysScoreSign = props.todaysScore >= 0 ? "+" : "-";
    if (props.todaysScore == 0) {
        todaysScoreSign = "";
    }

    return (<div>
        <div class="badge_container">
            <div class="total_badge">
                <div class="badge__label" id="totalPoints">
                    {todaysScoreSign}{props.todaysScore}
                </div>
                <div class="badge__label_sm" id="totalPoints">
                    total: {props.totalScore}
                </div>
            </div>
        </div>
    </div>);
}