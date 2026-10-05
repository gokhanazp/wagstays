import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/seo/schema";

export default function SiteLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <>
      <JsonLd data={[organizationSchema(), websiteSchema()]} />
      <Header />
      {children}
      <Footer />
    </>
  );
}
