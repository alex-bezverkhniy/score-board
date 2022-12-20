import { createContext } from "preact";

export const ScoreDataContext = createContext<any>({});

export class Score {
    url: string
}

export class Task {
    points: number
    task: string
}
export function toUnixTimestamp(str: string):number {
    return Math.floor(Date.parse(str) / 1000)
}
  