// NAMENSWERK 49 – shared name bank for every WOD builder view.
// Preserve the original vocabulary exactly; legacy compound phrases remain archived.
export const nameAdjectives=['Brutale','Wilde','Geile','Scharfe','Eiserne','Explosive','Böse','Dreckige','Donnernde','Panzerstarke','Stählerne','Brachiale','Knallharte','Furchtlose','Massive','Giftige','Hungrige','Brennende','Wuchtige','Legendäre','Gnadenlose','Kraftvolle','Kompromisslose','Jernharde','Svart','Rasande','Dieseldrevne','Elektriske','Høyspent','Ubøyelege','Stålsette','Infernalske']
export const nameNouns=['Panzer','Granate','Berserker','Keule','Kampfsau','Eber','Bär','Wolf','Gorilla','Mammut','Kobra','Hammer','Amboss','Donnerfaust','Stahlkoloss','Kraftpaket','Schlachtschiff','Sprengkopf','Dampfwalze','Kommandant','Knochenbrecher','Rammbock','Stahlfaust','Kampfhamster','Muskelmonster','Stålkjeven','Jernvilje','Betongbass','Dieselherz','Eisenwolf','Panzerpuls','Inferno 808','Hardhaus.exe','Tungt Vær','Svart Stål','Nattoget','Turbohelvete','Stålnakke','Betongbryter']
export const nameNumbers=['1942','1939','69']
export const nameThemes=Object.freeze({"military":["Blitzkrieg","Soldat","Panzer","Sturm","Krieg","Front","Kanone","Kommando","Stacheldraht","General","Bunker","Granate"],"industry":["Stahl","Eisen","Hammer","Maschine","Koloss","Kette","Diesel","Motor","Amboss","Kraftwerk"],"love":["Liebe","Lust","Sünde","Erotik","Kuss","Ekstase","Orgasmus","Verlangen","Leidenschaft","Versuchung"],"fire":["Feuer","Asche","Engel","Sonne","Sehnsucht","Benzin","Adieu","Zeit","Herz","Mutter","Rosenrot"],"fantasy":["Mordor","Balrog","Gandalf","Sauron","Uruk","Ork","Isengard","Morgul","Moria","Nazgûl","Rohan"],"intensity":["Wahnsinn","Donner","Blitz","Chaos","Schmerz","Hölle","Berserker","Zorn","Wut","Druck"],"humour":["Gazelle","Gorilla","Schnitzel","Wurst","Kartoffel","Gurke","Dackel","Disco","Schwein","Turbo"]})
const key=value=>String(value??'').trim().normalize('NFC').toLowerCase()
const unique=values=>[...new Map(values.map(value=>[key(value),value])).values()]
export const nameWords=Object.freeze(unique([...nameAdjectives,...nameNouns.flatMap(value=>value.split(/\s+/).filter(word=>!/^\d+$/.test(word))),...Object.values(nameThemes).flat()]))
export const nameSuffixes=Object.freeze(unique([...nameNumbers,...nameNouns.flatMap(value=>value.split(/\s+/).filter(word=>/^\d+$/.test(word))),'6','13','49','99','300']))
export const NAME_NUMBER_CHANCE=0.08
const pick=(values,rng)=>values[Math.min(values.length-1,Math.max(0,Math.floor(rng()*values.length)))]
export function randomWodName(rng=Math.random){
 const first=pick(nameWords,rng)
 const second=pick(nameWords.filter(word=>key(word)!==key(first)),rng)
 const base=first+' '+second
 return rng()<NAME_NUMBER_CHANCE?base+' '+pick(nameSuffixes,rng):base
}
export function uniqueWodName(existing=[],current='',rng=Math.random){
 const occupied=new Set([...existing.map(value=>key(typeof value==='object'?value?.name:value)),key(current)])
 for(let i=0;i<60;i++){const candidate=randomWodName(rng);if(!occupied.has(key(candidate)))return candidate}
 // Exhaustive fallback preserves the two-word rule and never returns a known duplicate.
 for(const first of nameWords)for(const second of nameWords){
  if(key(first)===key(second))continue
  const base=first+' '+second
  if(!occupied.has(key(base)))return base
 }
 for(const first of nameWords)for(const second of nameWords)if(key(first)!==key(second))for(const suffix of nameSuffixes){
  const candidate=first+' '+second+' '+suffix
  if(!occupied.has(key(candidate)))return candidate
 }
 throw Error('Alle namnekombinasjonane er i bruk. Skriv inn eit eige namn.')
}
