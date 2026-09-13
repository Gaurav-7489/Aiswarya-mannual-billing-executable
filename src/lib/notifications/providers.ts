import { selectOne, update } from '@/lib/db/client'

async function sendEmail(to:string, invoiceNumber:string){
  const apiKey=process.env.RESEND_API_KEY
  const from=process.env.NOTIFICATION_FROM_EMAIL
  if(!apiKey||!from)throw new Error('Email provider is not configured. Set RESEND_API_KEY and NOTIFICATION_FROM_EMAIL.')
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({from,to,subject:`Aiswarya Food Products · Invoice ${invoiceNumber}`,html:`<p>Please find your invoice <strong>${invoiceNumber}</strong> from Aiswarya Food Products.</p>`})})
  if(!response.ok)throw new Error(`Email provider returned ${response.status}.`)
}

async function sendWhatsApp(to:string,invoiceNumber:string){
  const token=process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId=process.env.WHATSAPP_PHONE_NUMBER_ID
  const template=process.env.WHATSAPP_TEMPLATE_NAME
  const language=process.env.WHATSAPP_TEMPLATE_LANGUAGE||'en_US'
  if(!token||!phoneNumberId||!template)throw new Error('WhatsApp provider is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_TEMPLATE_NAME.')
  const response=await fetch(`https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:to.replace(/\D/g,''),type:'template',template:{name:template,language:{code:language},components:[{type:'body',parameters:[{type:'text',text:invoiceNumber}]}]}})})
  if(!response.ok)throw new Error(`WhatsApp provider returned ${response.status}.`)
}

export async function deliverNotification(id:string){
  const notification=await selectOne<any>('notifications',`select=id,channel,recipient,invoice_id,attempts,status,invoices(invoice_number)&id=eq.${encodeURIComponent(id)}`)
  if(!notification)throw new Error('Notification not found.')
  if(!['PENDING','FAILED'].includes(String(notification.status)))return notification
  const invoiceNumber=String(notification.invoices?.invoice_number||'Invoice')
  const attempts=Number(notification.attempts||0)+1
  await update('notifications',`id=eq.${encodeURIComponent(id)}`,{status:'PROCESSING',attempts,updated_at:new Date().toISOString()})
  try{
    if(notification.channel==='EMAIL')await sendEmail(String(notification.recipient),invoiceNumber)
    else if(notification.channel==='WHATSAPP')await sendWhatsApp(String(notification.recipient),invoiceNumber)
    else throw new Error(`Unsupported notification channel: ${notification.channel}`)
    await update('notifications',`id=eq.${encodeURIComponent(id)}`,{status:'SENT',sent_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()})
    return {...notification,status:'SENT',attempts}
  }catch(error){
    const message=error instanceof Error?error.message:'Notification delivery failed.'
    await update('notifications',`id=eq.${encodeURIComponent(id)}`,{status:'FAILED',last_error:message,updated_at:new Date().toISOString()})
    throw error
  }
}
