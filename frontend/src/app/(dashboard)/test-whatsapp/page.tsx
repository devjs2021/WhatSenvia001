"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCcw, Info, CheckCircle2, XCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

interface TestResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
  details?: any;
  timestamp: string;
}

export default function TestWhatsAppPage() {
  const { t } = useI18n();
  const [token, setToken] = useState("");
  const [phoneId, setPhoneId] = useState("");
  const [targetPhone, setTargetPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    setToken(localStorage.getItem("test_whatsapp_token") || "");
    setPhoneId(localStorage.getItem("test_whatsapp_phone_id") || "");
    setTargetPhone(localStorage.getItem("test_whatsapp_target_phone") || "");
  }, []);

  const handleSend = async () => {
    const cleanToken = token.trim();
    const cleanPhoneId = phoneId.trim();
    const cleanTarget = targetPhone.trim();

    if (!cleanTarget || !cleanToken || !cleanPhoneId) return;
    
    localStorage.setItem("test_whatsapp_token", cleanToken);
    localStorage.setItem("test_whatsapp_phone_id", cleanPhoneId);
    localStorage.setItem("test_whatsapp_target_phone", cleanTarget);

    setSending(true);
    const timestamp = new Date().toLocaleTimeString();

    try {
      // Usamos fetch directo para evitar interceptores de sesión del dashboard
      const response = await fetch("/api/test-whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          to: cleanTarget,
          accessToken: cleanToken,
          phoneNumberId: cleanPhoneId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw { message: data.error || "Error", details: data };
      }

      setResults((prev) => [{ ...data, timestamp }, ...prev]);
    } catch (err: any) {
      setResults((prev) => [
        { 
          success: false, 
          error: err.message || t('testWhatsapp.connectionError'), 
          details: err.details || err,
          timestamp 
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('testWhatsapp.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('testWhatsapp.subtitle')}</p>
        </div>
        <Badge variant="outline" className="h-6">v25.0</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{t('testWhatsapp.metaConfig')}</CardTitle>
            <CardDescription>{t('testWhatsapp.metaConfigDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token">{t('testWhatsapp.accessToken')}</Label>
              <Input
                id="token"
                type="password"
                placeholder="EAA..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phoneId">{t('testWhatsapp.phoneNumberId')}</Label>
              <Input
                id="phoneId"
                placeholder={t('testWhatsapp.phoneNumberIdPlaceholder')}
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                <Info className="h-3 w-3" />
                <span dangerouslySetInnerHTML={{ __html: t('testWhatsapp.findItIn') }} />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">{t('testWhatsapp.recipient')}</CardTitle>
            <CardDescription>{t('testWhatsapp.recipientDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="target">{t('testWhatsapp.phoneNumber')}</Label>
              <Input
                id="target"
                placeholder={t('testWhatsapp.phonePlaceholder')}
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
              />
            </div>
            <Button 
              className="w-full" 
              onClick={handleSend}
              disabled={sending || !token || !phoneId || !targetPhone}
            >
              {sending ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  {t('testWhatsapp.testing')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('testWhatsapp.testSend')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {results.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">{t('testWhatsapp.testHistory')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setResults([])} className="h-8 text-xs">
              {t('testWhatsapp.clear')}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.map((res, i) => (
              <div key={i} className="border rounded-md p-3 text-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {res.success ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{res.success ? t('testWhatsapp.sent') : t('testWhatsapp.error')}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{res.timestamp}</span>
                </div>
                {res.success ? (
                  <p className="text-muted-foreground text-xs">{res.message}</p>
                ) : (
                  <p className="text-red-500 text-xs">{res.error}</p>
                )}
                <pre className="bg-muted p-2 rounded text-[10px] overflow-x-auto max-h-32">
                  {JSON.stringify(res.data || res.details, null, 2)}
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
