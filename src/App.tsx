import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { Toasts } from './components/ui'
import { ConnectStep, FirstItemStep, PairStep, PermissionsStep, Welcome } from './screens/Onboarding'
import { EditPackingList, Today } from './screens/Today'
import { AddItem, EditItem, ItemDetail, Items } from './screens/Items'
import { Directions, Find, Ring } from './screens/Find'
import {
  AccountSettings, ConnectionsSettings, HelpSettings, KeyringSettings, NotificationDemo,
  NotificationSettings, PlacesSettings, PrivacySettings, Settings,
} from './screens/Settings'

function RequireSetup({ children }: { children: ReactNode }) {
  const { state } = useStore()
  return state.onboarded ? <>{children}</> : <Navigate to="/welcome" replace />
}

function Home() {
  const { state } = useStore()
  return <Navigate to={state.onboarded ? '/today' : '/welcome'} replace />
}

const guarded: [string, ReactNode][] = [
  ['/today', <Today />],
  ['/today/edit', <EditPackingList />],
  ['/items', <Items />],
  ['/items/new', <AddItem />],
  ['/items/:id', <ItemDetail />],
  ['/items/:id/edit', <EditItem />],
  ['/find', <Find />],
  ['/find/:id', <Find />],
  ['/find/:id/ring', <Ring />],
  ['/find/:id/directions', <Directions />],
  ['/settings', <Settings />],
  ['/settings/keyring', <KeyringSettings />],
  ['/settings/connections', <ConnectionsSettings />],
  ['/settings/notifications', <NotificationSettings />],
  ['/settings/notification-demo', <NotificationDemo />],
  ['/settings/places', <PlacesSettings />],
  ['/settings/privacy', <PrivacySettings />],
  ['/settings/help', <HelpSettings />],
  ['/settings/account', <AccountSettings />],
]

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <div className="device">
          <div className="device-inner">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/setup/permissions" element={<PermissionsStep />} />
              <Route path="/setup/pair" element={<PairStep />} />
              <Route path="/setup/item" element={<FirstItemStep />} />
              <Route path="/setup/connect" element={<ConnectStep />} />
              {guarded.map(([path, el]) => (
                <Route key={path} path={path} element={<RequireSetup>{el}</RequireSetup>} />
              ))}
              <Route path="*" element={<Home />} />
            </Routes>
            <Toasts />
          </div>
        </div>
      </BrowserRouter>
    </StoreProvider>
  )
}
