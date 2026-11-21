import {Crown} from 'lucide-react'

// The verified owner is identified by the immutable Auth user id, never by
// editable display names, post snapshots, or a generic administrator role.
export const GARAGE_OWNER_USER_ID = '7196091b-62aa-420c-a548-b55f944f1e02'

export function isGarageOwner(userId){
 return !!userId&&userId===GARAGE_OWNER_USER_ID
}

export default function GarageOwnerBadge({userId}){
 if(!isGarageOwner(userId))return null
 return <span className="garage-owner-badge" title="Garasjeeigar · grunnleggjar og ansvarleg for GarasjeGym" aria-label="Garasjeeigar – grunnleggjar og ansvarleg for GarasjeGym"><Crown size={12} strokeWidth={2.5}/><span>GARASJEEIGAR</span></span>
}
