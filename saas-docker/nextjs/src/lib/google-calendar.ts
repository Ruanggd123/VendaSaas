/**
 * Google Calendar Helper
 * 
 * Para implementar a sincronização com Google Calendar, cada Tenant (cliente)
 * precisará autorizar o SaaS usando OAuth2 do Google.
 * As credenciais seriam armazenadas no banco (ex: google_refresh_token).
 */

export async function syncGoogleCalendar(appointment: any, accessToken: string) {
  if (!accessToken) return;
  
  try {
    const event = {
      summary: `Agendamento: ${appointment.customerName}`,
      description: `Agendamento criado via IA.\nServiço: ${appointment.service}\nTelefone: ${appointment.customerPhone}`,
      start: {
        dateTime: new Date(appointment.date.setHours(parseInt(appointment.startTime.split(':')[0]), parseInt(appointment.startTime.split(':')[1]))).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(appointment.date.setHours(parseInt(appointment.endTime.split(':')[0]), parseInt(appointment.endTime.split(':')[1]))).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!res.ok) {
      console.error('Erro ao sincronizar com Google Calendar:', await res.text());
    } else {
      console.log(`✅ Sincronizado no Google Calendar: ${appointment.customerName}`);
    }
  } catch (error) {
    console.error('Falha na sincronização do Google Calendar:', error);
  }
}
