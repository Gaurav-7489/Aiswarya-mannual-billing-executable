import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { selectOne, insert, update, remove } from '@/lib/db/client'
const COOKIE_NAME='aiswarya_session', SESSION_DAYS=7
const OWNER_PIN_KEY='auth.ownerPinHash', STAFF_PIN_KEY='auth.staffPinHash', SECRET_KEY='auth.sessionSecret', OWNER_NAME_KEY='auth.ownerName'
export type AuthRole='STAFF'|'OWNER'; export type Session={role:AuthRole;name:string;exp:number}; type StoredPin={salt:string;hash:string}
async function setting(key:string){return (await selectOne<{value:string}>('settings',`select=value&key=eq.${encodeURIComponent(key)}`))?.value??''}
async function setSetting(key:string,value:string){const existing=await selectOne('settings',`select=key&key=eq.${encodeURIComponent(key)}`);if(existing)await update('settings',`key=eq.${encodeURIComponent(key)}`,{value,updated_at:new Date().toISOString()});else await insert('settings',{key,value,updated_at:new Date().toISOString()})}
function hashPin(pin:string):StoredPin{const salt=crypto.randomBytes(16).toString('hex');return{salt,hash:crypto.scryptSync(pin,salt,64).toString('hex')}}
function verifyPin(pin:string,stored:string){try{const p=JSON.parse(stored) as StoredPin,a=crypto.scryptSync(pin,p.salt,64),b=Buffer.from(p.hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
async function sessionSecret(){let s=await setting(SECRET_KEY);if(!s){s=crypto.randomBytes(32).toString('hex');await setSetting(SECRET_KEY,s)}return s}
async function sign(body:string){return crypto.createHmac('sha256',await sessionSecret()).update(body).digest('base64url')}
async function encode(s:Session){const body=Buffer.from(JSON.stringify(s)).toString('base64url');return`${body}.${await sign(body)}`}
async function decode(value:string):Promise<Session|null>{try{const[body,sig]=value.split('.');if(!body||!sig)return null;const a=Buffer.from(sig),b=Buffer.from(await sign(body));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const s=JSON.parse(Buffer.from(body,'base64url').toString()) as Session;return s.exp>Date.now()&&['STAFF','OWNER'].includes(s.role)?s:null}catch{return null}}
export const isAuthConfigured=async()=>Boolean(await setting(OWNER_PIN_KEY)); export const getOwnerName=async()=>await setting(OWNER_NAME_KEY)||'Owner'; export const hasStaffPin=async()=>Boolean(await setting(STAFF_PIN_KEY))
export async function configurePins(ownerPin:string,staffPin:string|undefined,ownerName:string){if(!/^\d{4,8}$/.test(ownerPin))throw new Error('Owner PIN must contain 4 to 8 digits.');if(staffPin&&(!/^\d{4,8}$/.test(staffPin)||staffPin===ownerPin))throw new Error('Staff PIN must contain 4 to 8 digits and differ from the owner PIN.');await setSetting(OWNER_PIN_KEY,JSON.stringify(hashPin(ownerPin)));if(staffPin)await setSetting(STAFF_PIN_KEY,JSON.stringify(hashPin(staffPin)));else await remove('settings',`key=eq.${encodeURIComponent(STAFF_PIN_KEY)}`);await setSetting(OWNER_NAME_KEY,ownerName.trim()||'Owner');await insert('audit_logs',{id:crypto.randomUUID(),actor:'SETUP',action:'AUTH_CONFIGURED',entity_type:'auth',entity_id:'local',metadata_json:JSON.stringify({ownerName:ownerName.trim()||'Owner',staffPinConfigured:Boolean(staffPin)})})}
export async function authenticate(pin:string):Promise<AuthRole|null>{if(!await isAuthConfigured())return null;if(verifyPin(pin,await setting(OWNER_PIN_KEY)))return'OWNER';if(verifyPin(pin,await setting(STAFF_PIN_KEY)))return'STAFF';return null}
export async function getSession(){const c=await cookies(),v=c.get(COOKIE_NAME)?.value;return v?await decode(v):null}
export async function createSession(role:AuthRole){const name=role==='OWNER'?await getOwnerName():'Staff';const s:Session={role,name,exp:Date.now()+SESSION_DAYS*86400000};(await cookies()).set(COOKIE_NAME,await encode(s),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:SESSION_DAYS*86400});return s}
export async function clearSession(){(await cookies()).set(COOKIE_NAME,'',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0})}
export async function requireAuth(role?:AuthRole){const s=await getSession();if(!s)throw new Error('AUTH_REQUIRED');if(role&&s.role!==role)throw new Error('FORBIDDEN');return s}
export{COOKIE_NAME}
