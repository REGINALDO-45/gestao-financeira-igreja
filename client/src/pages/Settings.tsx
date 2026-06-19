import { useEffect, useState, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const { data: settings, isLoading } = trpc.churchSettings.get.useQuery();
  const updateSettings = trpc.churchSettings.update.useMutation();

  const [formData, setFormData] = useState({
    churchName: "",
    pastorName: "",
    treasurerName: "",
    defaultVerse: "",
    logoUrl: "",
  });

  const uploadLogo = trpc.churchSettings.uploadLogo.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(",")[1];
          const res = await uploadLogo.mutateAsync({
            filename: file.name,
            contentType: file.type,
            base64Data,
          });
          setFormData((prev) => ({ ...prev, logoUrl: res.url }));
          toast.success("Logo enviada com sucesso!");
        } catch (error) {
          toast.error("Erro ao enviar logo");
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Erro ao processar arquivo");
      setIsUploading(false);
    }
  };

  useEffect(() => {
    if (settings) {
      setFormData({
        churchName: settings.churchName || "",
        pastorName: settings.pastorName || "",
        treasurerName: settings.treasurerName || "",
        defaultVerse: settings.defaultVerse || "",
        logoUrl: settings.logoUrl || "",
      });
    }
  }, [settings]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings.mutateAsync({
        churchName: formData.churchName,
        pastorName: formData.pastorName,
        treasurerName: formData.treasurerName,
        defaultVerse: formData.defaultVerse,
        logoUrl: formData.logoUrl,
      });
      toast.success("Configurações atualizadas com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar configurações");
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Configurações da Igreja</h1>
          <p className="text-muted-foreground">
            Informações institucionais utilizadas nos relatórios
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados da Igreja</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label htmlFor="churchName">Nome da Igreja</Label>
                <Input
                  id="churchName"
                  placeholder="Ex: Igreja Metodista Monte Alegre"
                  value={formData.churchName}
                  onChange={(e) => setFormData({ ...formData, churchName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="pastorName">Nome do Pastor</Label>
                <Input
                  id="pastorName"
                  placeholder="Ex: Pr. Reginaldo Medeiros"
                  value={formData.pastorName}
                  onChange={(e) => setFormData({ ...formData, pastorName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="treasurerName">Nome da Tesoureira</Label>
                <Input
                  id="treasurerName"
                  placeholder="Ex: Ageovany"
                  value={formData.treasurerName}
                  onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="defaultVerse">Versículo Padrão</Label>
                <Textarea
                  id="defaultVerse"
                  placeholder="Ex: 2 Coríntios 9:7"
                  value={formData.defaultVerse}
                  onChange={(e) => setFormData({ ...formData, defaultVerse: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="logoUrl">URL do Logo</Label>
                <div className="flex gap-2">
                  <Input
                    id="logoUrl"
                    placeholder="https://example.com/logo.png"
                    value={formData.logoUrl}
                    onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                  </Button>
                </div>
                {formData.logoUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={formData.logoUrl}
                      alt="Logo da Igreja"
                      className="h-16 w-auto object-contain rounded border bg-white p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                      }}
                      onLoad={(e) => {
                        (e.target as HTMLImageElement).style.display = "";
                        (e.target as HTMLImageElement).nextElementSibling?.classList.add("hidden");
                      }}
                    />
                    <span className="hidden text-xs text-destructive">
                      Não foi possível carregar a imagem. Verifique se a URL aponta diretamente para um arquivo de imagem (PNG, JPG).
                    </span>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Salvar Configurações
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
