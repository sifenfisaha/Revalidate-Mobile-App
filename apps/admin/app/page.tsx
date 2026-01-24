import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminHomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 p-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-primary">
            Hello Admin
          </CardTitle>
          <CardDescription className="text-lg">
            Revalidation Tracker - Admin Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Manage users, subscriptions, and system settings
          </p>
          <div className="flex justify-center gap-4">
            <Button>View Users</Button>
            <Button variant="outline">Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
