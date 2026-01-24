import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExportsPage() {
  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Exports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Export management</p>
        </CardContent>
      </Card>
    </div>
  );
}
