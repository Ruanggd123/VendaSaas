'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

const formSchema = z.object({
  welcomeMessage: z.string().min(5),
  aiName: z.string().min(2),
  managerPhone: z.string().optional(),
  businessHours: z.object({
    start: z.string(),
    end: z.string(),
    days: z.array(z.string())
  }),
  services: z.array(z.object({
    name: z.string(),
    price: z.number(),
    description: z.string().optional(),
    duration: z.number().default(30)
  })),
  enableScheduling: z.boolean().default(true)
})

export function BotEditor({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false)
  const [config, setConfig] = useState<any>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      welcomeMessage: '',
      aiName: '',
      managerPhone: '',
      businessHours: {
        start: '08:00',
        end: '18:00',
        days: ['mon', 'tue', 'wed', 'thu', 'fri']
      },
      services: [],
      enableScheduling: true
    }
  })

  useEffect(() => {
    async function loadConfig() {
      setLoading(true)
      try {
        const res = await fetch(`/api/tenants/${tenantId}/bot-config`)
        const data = await res.json()
        if (data.success) {
          setConfig(data.config)
          form.reset(data.config)
        }
      } catch (error) {
        toast.error('Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [tenantId])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true)
      const res = await fetch(`/api/tenants/${tenantId}/bot-config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      })
      
      if (res.ok) {
        toast.success('Configurações salvas com sucesso!')
      } else {
        throw new Error()
      }
    } catch (error) {
      toast.error('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="welcomeMessage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mensagem de Boas-vindas</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Olá! Seja bem-vindo ao nosso atendimento..." />
                </FormControl>
                <FormDescription>
                  Esta mensagem será exibida quando o cliente iniciar uma conversa
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Outros campos do formulário... */}

          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </Form>
    </div>
  )
}
