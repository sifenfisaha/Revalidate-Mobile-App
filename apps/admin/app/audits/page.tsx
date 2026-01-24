import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuditsPage() {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Audits</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">System audits</p>
        </CardContent>
      </Card>
    </div>
  );
}
