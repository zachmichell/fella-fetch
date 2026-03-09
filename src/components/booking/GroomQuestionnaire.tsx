import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GroomQuestionnaireProps {
  petId: string;
  petName: string;
  clientId: string;
  onSubmit: (questionnaireId: string) => void;
  onCancel: () => void;
}

export function GroomQuestionnaire({ petId, petName, clientId, onSubmit, onCancel }: GroomQuestionnaireProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastGroomTimeframe, setLastGroomTimeframe] = useState('');
  const [coatCondition, setCoatCondition] = useState('');
  const [mattingLevel, setMattingLevel] = useState('');
  const [behaviorConcerns, setBehaviorConcerns] = useState('');
  const [lastGroomLocation, setLastGroomLocation] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 4) {
      toast({ title: 'Max 4 photos', variant: 'destructive' });
      return;
    }
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => setPreviewUrls(prev => [...prev, URL.createObjectURL(f)]));
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!coatCondition || !mattingLevel || !behaviorConcerns || !lastGroomTimeframe) {
      toast({ title: 'Please answer all questions', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const path = `questionnaires/${petId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('pet-photos').upload(path, photo);
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('pet-photos').getPublicUrl(path);
        photoUrls.push(urlData.publicUrl);
      }

      // Insert questionnaire
      const { data, error } = await supabase
        .from('groom_questionnaires')
        .insert({
          pet_id: petId,
          client_id: clientId,
          coat_condition: coatCondition,
          matting_level: mattingLevel,
          behavior_concerns: behaviorConcerns,
          last_groom_location: lastGroomLocation,
          last_groom_timeframe: lastGroomTimeframe,
          photo_urls: photoUrls,
        })
        .select('id')
        .single();

      if (error) throw error;
      onSubmit(data.id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Grooming Questionnaire — {petName}</CardTitle>
        <CardDescription>
          Since this is a new pet or it's been a while, we need some info before scheduling.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>How long since their last professional groom?</Label>
          <Select value={lastGroomTimeframe} onValueChange={setLastGroomTimeframe}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="less-than-4-weeks">Less than 4 weeks</SelectItem>
              <SelectItem value="4-8-weeks">4–8 weeks</SelectItem>
              <SelectItem value="2-3-months">2–3 months</SelectItem>
              <SelectItem value="3-6-months">3–6 months</SelectItem>
              <SelectItem value="6-plus-months">6+ months</SelectItem>
              <SelectItem value="never">Never / Unknown</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Coat Condition</Label>
          <Select value={coatCondition} onValueChange={setCoatCondition}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Well-maintained">Well-maintained</SelectItem>
              <SelectItem value="Some tangles">Some tangles</SelectItem>
              <SelectItem value="Matted">Matted</SelectItem>
              <SelectItem value="Severely matted">Severely matted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Matting Level</Label>
          <Select value={mattingLevel} onValueChange={setMattingLevel}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Mild">Mild</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="Severe">Severe</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Behavior Concerns During Grooming</Label>
          <Select value={behaviorConcerns} onValueChange={setBehaviorConcerns}>
            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="None">None</SelectItem>
              <SelectItem value="Mild anxiety">Mild anxiety</SelectItem>
              <SelectItem value="Reactive">Reactive</SelectItem>
              <SelectItem value="Aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Previous Grooming Location (optional)</Label>
          <Input
            placeholder="e.g., PetSmart, independent groomer..."
            value={lastGroomLocation}
            onChange={(e) => setLastGroomLocation(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Photos (up to 4)</Label>
          <div className="flex flex-wrap gap-3">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 4 && (
              <label className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                <Camera className="h-5 w-5 text-muted-foreground" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoAdd} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? 'Submitting...' : 'Submit Questionnaire'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
