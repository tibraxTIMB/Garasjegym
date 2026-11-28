import {exerciseMark} from '../lib/exerciseMark.js'
const paths={
 pause:'M9 5v14 M15 5v14',
 complex:'M12 3 3 8l9 5 9-5-9-5 M3 12l9 5 9-5 M3 16l9 5 9-5',
 core:'M5 17h15 M5 17v3 M19 17v3 M8 15l5-3 3-7 M13 12l5-5 M6 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4',
 box:'M4 21v-7h16v7 M4 17h16 M12 11V3 M9 6l3-3 3 3',
 row:'M3 20h18 M5 18l4-5 5 4h5 M9 13l4-5 5 2 M13 8l-3-3 M16 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M19 17v3',
 bike:'M2 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M14 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M6 17l5-9 7 9H6 M9 8h5 M16 5h3l-1 12',
 rope:'M5 12V8a7 7 0 0 1 14 0v4 M3 12h4v7H3z M17 12h4v7h-4z',
 trx:'M12 3v3 M6 18l6-12 6 12 M3 18h6v3H3z M15 18h6v3h-6z',
 kettlebell:'M8 8V6a4 4 0 0 1 8 0v2 M7 9a8 8 0 1 0 10 0z',
 dumbbell:'M8 12h8 M4 7h4v10H4z M16 7h4v10h-4z M2 10v4 M22 10v4',
 barbell:'M2 12h20 M5 7v10 M8 5v14 M16 5v14 M19 7v10',
 ball:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c4 4 4 14 0 18 M12 3c-4 4-4 14 0 18',
 hang:'M3 4h18 M8 4v5l4 4 4-4V4 M12 13v4l-3 4 M12 17l3 4 M12 8v1',
 burpee:'M3 20h18 M5 17l5-5 7 3h4 M10 12l1-5 4-3 M5 17l-2 3 M17 15v5',
 squat:'M14 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M13 8l-4 6 7 2-3 5 M9 14l-4 7 M13 9l7 3',
 push:'M3 20h18 M5 17l10-5 3 3v5 M5 17l-2 3 M20 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
 mobility:'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M3 10l9 3 9-3 M12 8v5l-6 7 M12 13l6 7',
 cardio:'M3 12h4l3-6 4 12 3-6h4',
 bench:'M3 11h18v3H3z M6 14v6 M18 14v6',
 body:'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4 M12 8v6 M5 11l7-3 7 3 M12 14l-5 7 M12 14l5 7'
}
export default function ExerciseMark({exercise}){
 const mark=exerciseMark(exercise)
 return <span className="gg-exercise-mark" data-mark={mark} aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[mark]||paths.body}/></svg></span>
}
