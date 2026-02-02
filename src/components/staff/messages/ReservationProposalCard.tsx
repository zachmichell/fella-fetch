import { format, parseISO, parse } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BedDouble, Scissors, Calendar, Clock, User, MapPin, Sun, ArrowRight } from 'lucide-react';

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
  reservationId?: string; // Links to the pending reservation created when proposal is sent
  status: 'pending_client_approval' | 'accepted' | 'declined';
}

interface ReservationProposalCardProps {
  proposal: ReservationProposalDisplayData;
  isClientView?: boolean;
  reservationStatus?: 'pending' | 'confirmed' | 'cancelled' | 'checked_in' | 'checked_out';
}

export function ReservationProposalCard({
  proposal,
  isClientView = false,
  reservationStatus,
}: ReservationProposalCardProps) {
  // Derive display status from reservation status
  const isAccepted = reservationStatus === 'confirmed' || reservationStatus === 'checked_in' || reservationStatus === 'checked_out';
  const isDeclined = reservationStatus === 'cancelled';
  const isPending = reservationStatus === 'pending' || !reservationStatus;

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
              {getServiceLabel()} {isClientView ? 'Proposal' : 'Request'}
            </span>
          </div>
          {/* Only show status badge for client view when pending, or for both when accepted/declined */}
          {(isAccepted || isDeclined) && (
            <Badge 
              variant={isAccepted ? 'default' : 'destructive'}
              className={isAccepted ? 'bg-green-500' : ''}
            >
              {isAccepted ? 'Accepted' : 'Declined'}
            </Badge>
          )}
          {isPending && isClientView && (
            <Badge variant="secondary">
              Awaiting Response
            </Badge>
          )}
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

        {/* Status Messages */}
        {isClientView && isPending && (
          <div className="text-center text-sm text-muted-foreground font-medium pt-2 border-t">
            ⏳ Awaiting staff confirmation
          </div>
        )}
        {isAccepted && (
          <div className="text-center text-sm text-green-600 font-medium pt-2 border-t">
            ✓ This reservation has been confirmed
          </div>
        )}
        {isDeclined && (
          <div className="text-center text-sm text-red-600 font-medium pt-2 border-t">
            ✗ This reservation was cancelled
          </div>
        )}
      </CardContent>
    </Card>
  );
}
