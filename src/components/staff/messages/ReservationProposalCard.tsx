import { format, parseISO, parse } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Scissors, Calendar, Clock, User, MapPin, Check, X, Loader2, Sun, ArrowRight } from 'lucide-react';

export interface ProposalStatus {
  status: 'pending_client_approval' | 'accepted' | 'declined';
}

export interface ReservationProposalDisplayData {
  type: 'reservation_proposal';
  serviceType: 'boarding' | 'grooming' | 'daycare';
  daycareType?: 'full' | 'half';
  petId: string;
  petName: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  groomerId?: string;
  groomerName?: string;
  suiteId?: string;
  suiteName?: string;
  notes?: string;
  shopifyProductId?: string;
  shopifyProductTitle?: string;
  shopifyVariantId?: string;
  shopifyVariantTitle?: string;
  price?: string;
  status: 'pending_client_approval' | 'accepted' | 'declined';
}

interface ReservationProposalCardProps {
  proposal: ReservationProposalDisplayData;
  isClientView?: boolean;
  onAccept?: () => Promise<void>;
  onDecline?: () => Promise<void>;
  isProcessing?: boolean;
}

export function ReservationProposalCard({
  proposal,
  isClientView = false,
  onAccept,
  onDecline,
  isProcessing = false,
}: ReservationProposalCardProps) {
  const isAccepted = proposal.status === 'accepted';
  const isDeclined = proposal.status === 'declined';
  const isPending = proposal.status === 'pending_client_approval';

  const getServiceIcon = () => {
    switch (proposal.serviceType) {
      case 'boarding':
        return <BedDouble className="h-5 w-5 text-primary" />;
      case 'grooming':
        return <Scissors className="h-5 w-5 text-primary" />;
      case 'daycare':
        return <Sun className="h-5 w-5 text-primary" />;
      default:
        return <Calendar className="h-5 w-5 text-primary" />;
    }
  };

  const getServiceLabel = () => {
    switch (proposal.serviceType) {
      case 'boarding':
        return 'Boarding';
      case 'grooming':
        return 'Grooming';
      case 'daycare':
        return proposal.daycareType === 'half' ? 'Half Day Daycare' : 'Full Day Daycare';
      default:
        return 'Reservation';
    }
  };

  return (
    <Card className={`border-2 ${
      isAccepted ? 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20' :
      isDeclined ? 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20' :
      'border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10'
    }`}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getServiceIcon()}
            <span className="font-semibold">
              {getServiceLabel()} Proposal
            </span>
          </div>
          <Badge 
            variant={isAccepted ? 'default' : isDeclined ? 'destructive' : 'secondary'}
            className={isAccepted ? 'bg-green-500' : ''}
          >
            {isAccepted ? 'Accepted' : isDeclined ? 'Declined' : 'Pending'}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Pet:</span>
            <span className="font-medium">{proposal.petName}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {format(parseISO(proposal.startDate), 'EEE, MMM d, yyyy')}
              {proposal.endDate && ` - ${format(parseISO(proposal.endDate), 'EEE, MMM d, yyyy')}`}
            </span>
          </div>

          {/* Time display - different for daycare vs grooming */}
          {proposal.serviceType === 'daycare' && proposal.startTime && proposal.endTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="flex items-center gap-1">
                {format(parse(proposal.startTime, 'HH:mm', new Date()), 'h:mm a')}
                <ArrowRight className="h-3 w-3" />
                {format(parse(proposal.endTime, 'HH:mm', new Date()), 'h:mm a')}
              </span>
            </div>
          )}

          {proposal.serviceType !== 'daycare' && proposal.startTime && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(parse(proposal.startTime, 'HH:mm', new Date()), 'h:mm a')}
              </span>
            </div>
          )}

          {proposal.groomerName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Groomer: {proposal.groomerName}</span>
            </div>
          )}

          {proposal.suiteName && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>Suite: {proposal.suiteName}</span>
            </div>
          )}

          {proposal.shopifyProductTitle && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Service:</span>
              <span>
                {proposal.shopifyProductTitle}
                {proposal.shopifyVariantTitle && ` - ${proposal.shopifyVariantTitle}`}
              </span>
            </div>
          )}

          {proposal.price && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-semibold text-primary">
                ${parseFloat(proposal.price).toFixed(2)}
              </span>
            </div>
          )}

          {proposal.notes && (
            <div className="text-muted-foreground italic border-t pt-2 mt-2">
              {proposal.notes}
            </div>
          )}
        </div>

        {/* Action Buttons (Client View Only) */}
        {isClientView && isPending && onAccept && onDecline && (
          <div className="flex gap-2 pt-3 border-t">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 text-destructive border-destructive/50 hover:bg-destructive/10"
              onClick={onDecline}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
              Decline
            </Button>
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onAccept}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Accept
            </Button>
          </div>
        )}

        {/* Status Messages */}
        {isAccepted && (
          <div className="text-center text-sm text-green-600 font-medium pt-2 border-t">
            ✓ This reservation has been confirmed
          </div>
        )}
        {isDeclined && (
          <div className="text-center text-sm text-red-600 font-medium pt-2 border-t">
            ✗ This proposal was declined
          </div>
        )}
      </CardContent>
    </Card>
  );
}
