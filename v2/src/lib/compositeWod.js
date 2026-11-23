// Samansett treningsøkt: kvar del har eige format, varigheit og øvingar.
// Den eksisterande WOD-motoren og timeren blir brukte per del.
export const COMPOSITE_FORMAT = 'Samansett økt'
export const COMPOSITE_BLOCK_FORMATS = ['AMRAP','E1MOM','E2MOM','E3MOM','E4MOM','E5MOM','E6MOM','E7MOM']

export const defaultCompositeBlocks = () => [
  {id:'a',title:'Del A',format:'E3MOM',minutes:9},
  {id:'b',title:'Del B',format:'AMRAP',minutes:8},
]

export function compositeIntervalMinutes(format) {
  const match = /^E([1-7])MOM$/.exec(String(format||''))
  return match ? Number(match[1]) : null
}

export function compositeBlockDuration(block) {
  return Math.round(Number(block?.minutes || 0)*60)
}

export function validateCompositeBlocks(blocks,items=[]) {
  if (!Array.isArray(blocks) || blocks.length<2 || blocks.length>8) return 'Ei samansett økt må ha 2–8 delar.'
  const ids = new Set()
  for (const block of blocks) {
    if (!block.id || ids.has(block.id)) return 'Kvar øktdel må ha ein unik identifikator.'
    ids.add(block.id)
    if (!COMPOSITE_BLOCK_FORMATS.includes(block.format)) return 'Vel eit støtta format for '+(block.title||'økta')+'.'
    if (!Number.isInteger(Number(block.minutes)) || Number(block.minutes)<1 || Number(block.minutes)>180) return 'Vel 1–180 minutt for '+(block.title||'økta')+'.'
    const every=compositeIntervalMinutes(block.format)
    if (every && Number(block.minutes)%every!==0) return (block.title||'Øktdel')+' må ha heilskaplege '+every+'-minuttsintervall.'
    if (!items.some(item=>item.blockId===block.id || item.block_id===block.id)) return (block.title||'Øktdel')+' manglar øvingar.'
  }
  if (items.some(item=>!ids.has(item.blockId||item.block_id))) return 'Alle øvingar må høyra til ein gyldig øktdel.'
  return ''
}

export function compositeBlockForTimer(block, index=0) {
  const items=Array.isArray(block?.items)?block.items:[]
  const every=compositeIntervalMinutes(block.format)
  const slots=every?Math.floor(Number(block.duration_seconds||0)/(every*60)):0
  return {
    ...block,
    title:block.title||'Del '+(index+1),
    items: every ? items.map(item=>({...item,minute_slot:item.minute_slot||Array.from({length:slots},(_,i)=>i+1).join(',')})) : items,
  }
}

export function compositeTotalSeconds(blocks) {
  return (blocks||[]).reduce((total,block)=>total+compositeBlockDuration(block),0)
}
