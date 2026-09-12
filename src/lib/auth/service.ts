import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/db/client'

const COOKIE_NAME='aiswarya_session', SESSION_DAYS=7
const OWNER_PIN_KEY='auth.ownerPinHash', STAFF_PIN_KEY='auth.staffPinHash', SECRET_KEY='auth.sessionSecret', OWNER_NAME_KEY='auth.ownerName'
export type AuthRole='STAFF'|'OWNER'
export type Session={role:AuthRole;name:string;exp:number}
type StoredPin={salt:string;hash:string}
const setting=(key:string)=>(getDatabase().prepare('SELECT value FROM settings WHERE key=?').get(key) as {value:string}|undefined)?.value??''
const setSetting=(key:string,value:string)=>getDatabase().prepare('INSERT INTO settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run(key,value,new Date().toISOString())
function hashPin(pin:string):StoredPin{const salt=crypto.randomBytes(16).toString('hex');return{salt,hash:crypto.scryptSync(pin,salt,64).toString('hex')}}
function verifyPin(pin:string,stored:string){try{const p=JSON.parse(stored) as StoredPin;const a=crypto.scryptSync(pin,p.salt,64),b=Buffer.from(p.hash,'hex');return a.length===b.length&&crypto.timingSafeEqual(a,b)}catch{return false}}
function sessionSecret(){let s=setting(SECRET_KEY);if(!s){s=crypto.randomBytes(32).toString('hex');setSetting(SECRET_KEY,s)}return s}
const sign=(body:string)=>crypto.createHmac('sha256',sessionSecret()).update(body).digest('base64url')
function encode(s:Session){const body=Buffer.from(JSON.stringify(s)).toString('base64url');return`${body}.${sign(body)}`}
function decode(value:string):Session|null{try{const[body,sig]=value.split('.');if(!body||!sig)return null;const a=Buffer.from(sig),b=Buffer.from(sign(body));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const s=JSON.parse(Buffer.from(body,'base64url').toString()) as Session;return s.exp>Date.now()&&['STAFF','OWNER'].includes(s.role)?s:null}catch{return null}}
export const isAuthConfigured=()=>Boolean(setting(OWNER_PIN_KEY))
export const getOwnerName=()=>setting(OWNER_NAME_KEY)||'Owner'
export const hasStaffPin=()=>Boolean(setting(STAFF_PIN_KEY))
export function configurePins(ownerPin:string,staffPin:string|undefined,ownerName:string){if(!/^\d{4,8}$/.test(ownerPin))throw new Error('Owner PIN must contain 4 to 8 digits.');if(staffPin&&(!/^\d{4,8}$/.test(staffPin)||staffPin===ownerPin))throw new Error('Staff PIN must contain 4 to 8 digits and differ from the owner PIN.');setSetting(OWNER_PIN_KEY,JSON.stringify(hashPin(ownerPin)));if(staffPin)setSetting(STAFF_PIN_KEY,JSON.stringify(hashPin(staffPin)));else getDatabase().prepare('DELETE FROM settings WHERE key=?').run(STAFF_PIN_KEY);setSetting(OWNER_NAME_KEY,ownerName.trim()||'Owner');getDatabase().prepare('INSERT INTO audit_logs(id,actor,action,entity_type,entity_id,metadata_json,created_at) VALUES(lower(hex(randomblob(16))),?,?,?,?,?,?)').run('SETUP','AUTH_CONFIGURED','auth','local',JSON.stringify({ownerName:ownerName.trim()||'Owner',staffPinConfigured:Boolean(staffPin)}),new Date().toISOString())}
export function authenticate(pin:string):AuthRole|null{if(!isAuthConfigured())return null;if(verifyPin(pin,setting(OWNER_PIN_KEY)))return'OWNER';if(verifyPin(pin,setting(STAFF_PIN_KEY)))return'STAFF';return null}
export async function getSession(){const c=await cookies(),v=c.get(COOKIE_NAME)?.value;return v?decode(v):null}
export async function createSession(role:AuthRole){const s:Session={role,name:role==='OWNER'?getOwnerName():'Staff',exp:Date.now()+SESSION_DAYS*86400000};(await cookies()).set(COOKIE_NAME,encode(s),{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:SESSION_DAYS*86400});return s}
export async function clearSession(){(await cookies()).set(COOKIE_NAME,'',{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:0})}
export async function requireAuth(role?:AuthRole){const s=await getSession();if(!s)throw new Error('AUTH_REQUIRED');if(role&&s.role!==role)throw new Error('FORBIDDEN');return s}
export{COOKIE_NAME}
