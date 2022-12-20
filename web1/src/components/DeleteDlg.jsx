import { useContext, useState } from "preact/hooks";
import { ScoreDataContext } from "../common";

export function DeleteDlg(props) {
    const [show, setShow] = useState(props.show);
    const { deleteScoreData, selectKey, selectedKey } = useContext(ScoreDataContext);

    const onClose = (e) => {
        //setShow(false);        
        selectKey('');
        e.preventDefault();
    }

    const onDelete = (e) => {
        deleteScoreData(selectedKey)
        selectKey('');
        e.preventDefault();
    }

    return (
        <div class={selectedKey != '' ? 'modal active' : 'modal d-hide'} id="modal-id">
            <a href="#close" onClick={onClose} style="z-index:0;" class="modal-overlay" aria-label="Close"></a>
            <div class="modal-container">
                <div class="modal-header">
                    <a href="#close" class="btn btn-clear float-right" aria-label="Close"></a>
                    <div class="modal-title h5">Delete task: {props.show}</div>
                </div>
                <div class="modal-body">
                    <div class="content">
                        Are you sure you want to delete the task?
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onClick={onDelete}>Yes</button>
                    <button class="btn btn-link" onClick={onClose}>No</button>
                </div>
            </div>
        </div>
    )
}