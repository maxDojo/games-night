import { Layers3, List, Timer, Users } from 'lucide-react-native';

import type { HostRoute } from '../../types/product';
import { BottomNav } from './BottomNav';

interface HostNavProps {
  active: HostRoute;
  onChange: (route: HostRoute) => void;
}

export function HostNav({ active, onChange }: HostNavProps) {
  const activeTab = active === 'settings' || active === 'lobby' ? 'parties' : active;

  return (
    <BottomNav
      items={[
        { route: 'parties', label: 'ROOMS', icon: Layers3 },
        { route: 'queue', label: 'RUN', icon: List },
        { route: 'teams', label: 'TEAMS', icon: Users },
        { route: 'stage', label: 'LIVE', icon: Timer },
      ]}
      active={activeTab}
      onChange={onChange}
    />
  );
}
