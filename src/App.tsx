import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { SyncManager } from './sync'
import { Toasts } from './components/ui'
import { Login } from './screens/Login'
import { ConnectStep, FirstItemStep, PairStep, PermissionsStep } from './screens/Onboarding'
import { TimetableSettings, TimetableStep } from './screens/Timetable'
import { EditPackingList, Today } from './screens/Today'
import { AddItem, EditItem, ItemDetail, Items } from './screens/Items'
import { Directions, Find, Ring } from './screens/Find'
import {
  AccountSettings, ConnectionsSettings, HelpSettings, KeyringSettings, NotificationDemo,
  NotificationSettings, PlacesSettings, PrivacySettings, Settings,
} from './screens/Settings'

/** Signed in (or demo) and set up. */
function RequireSetup({ children }: { children: ReactNode }) {
  const { state } = useStore()
  if (!state.user) return <Navigate to="/login" replace />
  if (!state.onboarded) return <Navigate to="/setup/permissions" replace />
  return <>{children}</>
}

/** Signed in, still in setup. */
function RequireUser({ children }: { children: ReactNode }) {
  const { state } = useStore()
  return state.user ? <>{children}</> : <Navigate to="/login" replace />
}

function Home() {
  const { state } = useStore()
  return <Navigate to={!state.user ? '/login' : state.onboarded ? '/today' : '/setup/permissions'} replace />
}

const setup: [string, ReactNode][] = [
  ['/setup/permissions', <PermissionsStep />],
  ['/setup/pair', <PairStep />],
  ['/setup/timetable', <TimetableStep />],
  ['/setup/item', <FirstItemStep />],
  ['/setup/connect', <ConnectStep />],
]

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
  ['/settings/timetable', <TimetableSettings />],
  ['/settings/keyring', <KeyringSettings />],
  ['/settings/connections', <ConnectionsSettings />],
  ['/settings/notifications', <NotificationSettings />],
  ['/settings/notification-demo', <NotificationDemo />],
  ['/settings/places', <PlacesSettings />],
  ['/settings/privacy', <PrivacySettings />],
  ['/settings/help', <HelpSettings />],
  ['/settings/account', <AccountSettings />],
]

const ShopApp = lazy(() => import('./shop/Shop'))

function PhoneApp() {
  return (
    <>
      <SyncManager />
      <div className="device">
          <div className="device-inner">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/welcome" element={<Navigate to="/login" replace />} />
              {setup.map(([path, el]) => <Route key={path} path={path} element={<RequireUser>{el}</RequireUser>} />)}
              {guarded.map(([path, el]) => <Route key={path} path={path} element={<RequireSetup>{el}</RequireSetup>} />)}
              <Route path="*" element={<Home />} />
            </Routes>
            <Toasts />
          </div>
        </div>
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/shop/*" element={<Suspense fallback={null}><ShopApp /></Suspense>} />
          <Route path="*" element={<PhoneApp />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
