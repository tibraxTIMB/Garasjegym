import React from 'react'
import {muscleProfile,MUSCLE_LABELS} from '../lib/muscleProfile.js'
import AnatomyEvidence from './AnatomyEvidence.jsx'
import './muscle-map.css'

// Compact planned roles use the same catalogue and terminology as the full map.
// Never turn roles into numerical intensity estimates.
export default function MuscleMap({items=[],interactive=false}){
 const profile=muscleProfile(items)
 if(!profile.known)return interactive?<p>Ingen klassifiserte øvingar enno. Ukjende øvingar får ikkje automatisk muskelprofil.</p>:null
 if(profile.known===profile.mobility)return <div className="gg-muscle-map"><small>Mobilitetsarbeid · ikkje gradert som styrke- eller kraftarbeid.</small></div>
 if(interactive)return <AnatomyEvidence exercises={items} scope="Planlagde rørsler" planned expanded/>
 return <div className="gg-muscle-map" aria-label="Planlagde anatomiske roller"><div className="gg-muscle-content"><strong>Primær involvering</strong><small>{profile.primary.map(k=>MUSCLE_LABELS[k]).join(', ')||'Sjå anatomiske roller'}</small><AnatomyEvidence exercises={items} scope="Planlagde rørsler" planned/></div></div>
}
