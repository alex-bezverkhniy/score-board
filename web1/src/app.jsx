import { useEffect, useMemo, useState } from 'preact/hooks'
import './app.css'
import 'spectre.css'
import { Navigation } from './components/Navigation';
import { StatusBage } from './components/StatusBage';
import { FilterForm } from './components/FilterForm';
import { TasksLog } from './components/TasksLog';
import { AddTaskForm } from './components/AddTaskForm';
import { baseUrl, ScoreDataContext, toUnixTimestamp } from './common';


export function App() {
  const [scoreData, setScoreData] = useState({});

  const [tasksData, setTasksData] = useState({
    data: []
  });
  const [selectedKey, setSelectedKey] = useState('');
  const [calType, setCalType] = useState('today');

  function getFirstDayOfWeek(d) {
    d = new Date(d);
    var day = d.getDay(),
      diff = d.getDate() - day + (day == 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  function getFirstDayOfMonth(d) {
    d.setSeconds(1);
    return new Date(`${new Date().getFullYear()}-${new Date().getMonth() + 1}-01`);
  }

  function useCalType(t) {
    console.log('cal type', t);
    setCalType(t);
    let url = baseUrl;
    let d = new Date();
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    switch (t) {
      case 'today':
        console.log(t, d.toISOString());
        fetchScoreData(`${baseUrl}/${toUnixTimestamp(d.toISOString())}`);
        break;
      case 'week':
        d = getFirstDayOfWeek(d);
        console.log(t, d.toISOString());
        fetchScoreData(`${baseUrl}/${toUnixTimestamp(d.toISOString())}`);
        break;
      case 'month':
        d = getFirstDayOfMonth(d);
        console.log(t, d.toISOString());
        fetchScoreData(`${baseUrl}/${toUnixTimestamp(d.toISOString())}`);
        break;
      default:
        fetchScoreData(url)
    }
  }

  function selectKey(key) {
    setSelectedKey(key);
  }

  function fetchScoreData(url) {
    console.log("fetchScoreData", url);
    url = (url == null || url == undefined || url == "") ? scoreData.url : url
    url = (url == null || url == undefined || url == "") ? baseUrl : url

    fetch(url)
      .then((data) => {
        return data.json()
      })
      .then((json) => {
        console.log(json);
        const newScoreData = {
          tasksData: json,
          url: url
        }
        setScoreData(newScoreData);
        setTasksData(json);
      });
  }

  function deleteScoreData(k) {
    console.log("deleteScoreData", k);
    const url = `${baseUrl}/${k}`

    fetch(url, {
      method: "DELETE"
    })
      .then((data) => {
        fetchScoreData()
        return data.json()
      })

  }

  useEffect(() => {
    const url = localStorage.getItem('apiURL') ? localStorage.getItem('apiURL') : "/api/score"; //"/api/score"		
    useCalType('today')
  }, []);

  const scoreDataResource = useMemo(() => {
    return { selectedKey, scoreData, fetchScoreData, deleteScoreData, selectKey, calType, useCalType };
  }, [scoreData, selectedKey, calType]);

  return (
    <ScoreDataContext.Provider value={scoreDataResource}>
      <header class="navbar">
        <Navigation />
      </header>
      <main>
        <div class="container">
          <div class="columns">
            <div class="column col-4 col-md-10 col-xl-8 col-mx-auto">
              <div class="card">
                <div class="card-header">
                  <div class="card-title h5 text-capitalize">{calType}</div>
                </div>
                <div class="card-image">
                  <StatusBage todaysScore={tasksData.total_starts_at} totalScore={tasksData.total_points} />
                </div>
                <div class="card-header">
                  <FilterForm />
                </div>
                <div class="card-body">
                  <TasksLog tasks={tasksData.data} />
                </div>
                <div class="card-footer">
                  <AddTaskForm />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer>
        <div class="columns">
          <div class="column col-4 col-md-10 col-xl-8 col-mx-auto">
            Eva's Score
          </div>
        </div>
      </footer>
    </ScoreDataContext.Provider>
  )
}
