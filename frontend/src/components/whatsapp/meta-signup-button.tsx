'use client'

import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    FB: any
    fbAsyncInit: () => void
  }
}

interface MetaSignupButtonProps {
  onSuccess: (code: string, wabaId: string, phoneNumberId: string) => void
}

let fbReadyPromise: Promise<void> | null = null

function loadFBSdk(): Promise<void> {
  if (fbReadyPromise) return fbReadyPromise

  fbReadyPromise = new Promise<void>((resolve, reject) => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) {
      reject(new Error('NEXT_PUBLIC_META_APP_ID is not configured'))
      return
    }

    const doInit = () => {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      })
      resolve()
    }

    if (window.FB) {
      doInit()
      return
    }

    window.fbAsyncInit = doInit

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'))
      document.body.appendChild(script)
    }
  })

  return fbReadyPromise
}

export function MetaSignupButton({ onSuccess }: MetaSignupButtonProps) {
  useEffect(() => {
    loadFBSdk().catch(console.error)
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com') return
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          console.log('Datos del registro:', data)
        }
      } catch {}
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleClick = useCallback(async () => {
    try {
      await loadFBSdk()
    } catch (err) {
      alert('No se pudo cargar el SDK de Facebook. Verifica la configuración.')
      console.error(err)
      return
    }

    window.FB.login((response: any) => {
      if (response.authResponse) {
        const code = response.authResponse.code
        const wabaId = sessionStorage.getItem('wabaId') || ''
        const phoneNumberId = sessionStorage.getItem('phoneNumberId') || ''
        onSuccess(code, wabaId, phoneNumberId)
      }
    }, {
      config_id: '990741733486379',
      response_type: 'code',
      override_default_response_type: true,
      extras: { version: 'v4' }
    })
  }, [onSuccess])

  return (
    <Button
      onClick={handleClick}
      className="bg-[#1877F2] hover:bg-[#1877F2]/90 text-white gap-2 w-full"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
      Conectar WhatsApp Business Oficial
    </Button>
  )
}
