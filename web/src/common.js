import { createContext } from "preact";

export const ScoreDataContext = createContext({
    selectedKey: ''
});
export const baseUrl = '/api/score'

export class Score {
    url
}

export class Task {
    points
    task
}
export function toUnixTimestamp(str) {
    return Math.floor(Date.parse(str) / 1000)
}
  