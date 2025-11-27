import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/home/text')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/home/text"!</div>
}
