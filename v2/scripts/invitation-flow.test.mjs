import test from 'node:test'
import assert from 'node:assert/strict'
import {isInviteLanding,clearInviteLanding} from '../src/lib/invitationFlow.js'

test('invited member keeps welcome state with query hint after auth consumes hash',()=>{
 assert.equal(isInviteLanding({search:'?welcome=invite',hash:''}),true)
 assert.equal(isInviteLanding({search:'',hash:'#access_token=abc&type=invite'}),true)
 assert.equal(isInviteLanding({search:'',hash:'#type=recovery'}),false)
 assert.equal(isInviteLanding({search:'',hash:''}),false)
})

test('welcome marker disappears without losing ordinary query settings',()=>{
 let replaced=''
 const win={location:{href:'https://example.org/Garasjegym/?welcome=invite&source=member#type=invite'},history:{state:{},replaceState(_state,_title,url){replaced=url}}}
 clearInviteLanding(win)
 assert.equal(replaced,'/Garasjegym/?source=member')
})
