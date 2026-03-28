export default function GallerySection() {
  return (
    <section className="bg-[#2e2f2e] py-24 text-[#f7f6f4]">
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="flex items-center justify-between mb-16">
          <h2 className="font-headline text-5xl font-black tracking-tighter uppercase italic text-[#fdd400]">
            NUESTRAS FAVORITAS
          </h2>
          <span className="font-headline font-bold italic text-xl opacity-80">
            Pregunta por los favoritos de la casa
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          <div className="md:col-span-2 md:row-span-2 rounded-lg overflow-hidden group">
            <img
              className="mobile-scroll-zoom w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Top down view of crispy golden french fries topped with melted cheese, spicy peppers, and green onions served in a street style cardboard box"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXIvGc1yyMN7sEeMSkfjtxHFskE04xQM-yLzFNKXe-eSm7vQ3RXpWYrbIZuSRXpK57nlugRGuayB9Ku8Gtp7fwr8p7rpXDoBb_UAjbS1sdYtBb8LcUFbyPXpB9vb5GjdeWE2sYwGVUtAclA6fAAronp6VPoHF5wlYm55WRMdZh3vR1bDTo6qDl1ZkJjAdYXmm290BFd-NWFpwNvJG9rNUPaRcl5zZFYW8Dc-CA1ENqnTTzVgvA82TQARUL0I1-QqJpNh5wViHU"
            />
          </div>

          <div className="rounded-lg overflow-hidden h-64 group">
            <img
              className="mobile-scroll-zoom w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Juicy smash burger with extra crispy edges, melted American cheese, and caramelized onions on a buttered bun"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCkT2n8yS5SboSUTsQWl3Fpycf6h9hnfjjphxVbg67BBAlKk5K72KWWJKri616J2MCetUDhPrTTb2bS7eWUvt0Iv-RIYnMdnBxe6hEZpCbgi8NxxsXXbWB8WRFZMJ1h6jjnuVRrHs0-6zsW6-J7KorLlBz8jTTClMuHrHUCuXtV64yXj8M5I3ZBspaQXsX7u2yn15HwUFvEcWqNzMbAIpnlxOqG2BEYUPdqMXDgiWdAVkUWOB7Q5JJtQaI-xQvyKTEWrbe4-XLn"
            />
          </div>

          <div className="rounded-lg overflow-hidden h-64 group">
            <img
              className="mobile-scroll-zoom w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Gourmet hot dog with artisan toppings including spicy mayo and crispy onions in a soft brioche bun"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA54iTw4ihDcwmeQXRL65sU2LM87QTsemGt1qWo_qArPoTZb_EVoR3hkf6yezErKYuejuMsi2JQUXXHEP_Put3_zKJgcIjcaT8ghCX4k5304ezwxLr9VvqfCLzgd_YR8wZr6deot4iWn-r0VgspqfDKlgBsNvPiNCIzFfw-2-cIdQlzI1LgTiW_dKqbCQMNKZQd3s6c1ffngR6NWnBg8UpsxN4cZzXpN94GX0n9gODsBOFfjIK62C3vU0iiptlp--CIDQ5AaXdf"
            />
          </div>

          <div className="md:col-span-2 rounded-lg overflow-hidden h-80 group">
            <img
              className="mobile-scroll-zoom w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              alt="Modern street tacos with marinated meat, fresh cilantro, radish, and lime on a rustic platter"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDKT1rfgpZZ-nJevpQnZl9tK7dKcH-ocRAFZo5wvBMnMbjMq689eBy4KDBH4-wkjam-DvAjBOEe-P-xkNvlrpasy5knb-CSfnrepDupaXsB0Neqim5mvPmuYkwRzmOi7l3cK2RNOVR6cen-BmCc9A1FN3CctPVRF_7FmyxWkuA-OXb57Jzbf0hQYnTfyqeY7Qfs2fMaKWR_O7nhvWZAfq_oaDKJxG59ozsIi5NnNRcjh_oAbIe-rzQ5eKNAqgfhcrcBGPctjmv"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
