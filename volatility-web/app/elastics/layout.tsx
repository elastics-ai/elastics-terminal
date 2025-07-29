import { ElasticsLayout } from '@/components/layout/elastics-layout'

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ElasticsLayout>{children}</ElasticsLayout>
}