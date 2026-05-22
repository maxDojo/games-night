import { Crown, List, Timer, Users } from 'lucide-react-native';

import type { HostRoute } from '../../types/product';
import { BottomNav } from './BottomNav';

interface HostNavProps {
  active: HostRoute;
  onChange: (route: HostRoute) => void;
}

export function HostNav({ active, onChange }: HostNavProps) {
  return (
    <BottomNav
      items={[
        { route: 'lobby', label: 'HOST', icon: Crown },
        { route: 'queue', label: 'RUN', icon: List },
        { route: 'teams', label: 'TEAMS', icon: Users },
        { route: 'stage', label: 'LIVE', icon: Timer },
      ]}
      active={active}
      onChange={onChange}
    />
  );
}
