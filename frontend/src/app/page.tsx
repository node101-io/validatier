import Intro from "@/components/intro/intro";
import Navbar from "@/components/navbar/navbar";

export default function Home() {
    return (
        <div className="all-main-wrapper">
            <Navbar />
            <Intro />
        </div>
    );
}
