import { Contact } from "@/components/contact";
import { Grain } from "@/components/grain";
import { Hero } from "@/components/hero";
import { Nav } from "@/components/nav";
import { Principles } from "@/components/principles";
import { Work } from "@/components/work";

export default function Home() {
  return (
    <>
      <Grain />
      <Nav />
      <main>
        <Hero />
        <Work />
        <Principles />
        <Contact />
      </main>
    </>
  );
}
