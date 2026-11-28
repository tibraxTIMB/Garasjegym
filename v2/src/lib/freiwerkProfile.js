// FREIWERK visual-only candidate. No persisted preferences or training data writes.
export const FREIWERK_PROFILE='freiwerk'
export function applyFreiwerkProfile(root,enabled=true){
 if(!root?.dataset)return
 if(enabled)root.dataset.ggDesign=FREIWERK_PROFILE
 else delete root.dataset.ggDesign
}
