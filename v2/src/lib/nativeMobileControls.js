/** Helpers for styling existing HTML select fields without rewriting forms. */

export function nativeSelectOptions(select) {
  return [...select.options].map((option, index) => ({
    index,
    value:option.value,
    label:option.label||option.textContent||option.value,
    disabled:option.disabled||Boolean(option.closest('optgroup')?.disabled),
    group:option.closest('optgroup')?.label||'',
  }))
}

export function nativeSelectTitle(select) {
  const accessibleName=select.getAttribute('aria-label')||select.getAttribute('title')
  if(accessibleName)return accessibleName
  const label=select.labels?.[0]
  if(label){
    const caption=label.querySelector('span, strong')?.textContent?.trim()
    if(caption)return caption
    const directText=[...label.childNodes].filter(node=>node.nodeType===3)
      .map(node=>node.textContent.trim()).filter(Boolean).join(' ').trim()
    if(directText)return directText
  }
  return 'Vel eit alternativ'
}

export function chooseNativeSelectOption(select,index) {
  const option=select.options[index]
  if(!option||option.disabled||option.closest('optgroup')?.disabled||select.disabled||!select.isConnected)return false
  if(select.selectedIndex!==index){
    // Change the *real* form field so React's existing onChange handler,
    // validation, controlled value and submit code all keep working.
    select.selectedIndex=index
    select.dispatchEvent(new Event('input',{bubbles:true}))
    select.dispatchEvent(new Event('change',{bubbles:true}))
  }
  return true
}
