/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Shield,
  Calculator,
  Users,
  ChevronDown,
  ChevronUp,
  Church,
  FolderArchive,
  FileSpreadsheet,
  ReceiptText,
  Lock,
  Scale,
  FileCheck,
  Info,
  Check,
  DollarSign,
  ArrowRight,
  Database,
  ArrowRightLeft,
  Calendar,
  Sparkles,
  Award,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const UserGuidePage: React.FC = () => {
  const { currentUser } = useAuth();
  const { settings } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [openChapter, setOpenChapter] = useState<string>('bab-1');

  // Daftar Peran untuk Filter Cepat Panduan
  const roleFilters = [
    { id: 'all', label: 'Semua Panduan Lengkap', icon: BookOpen },
    { id: 'bendahara_umum', label: 'Bendahara Huria (Umum)', icon: DollarSign },
    { id: 'auditor', label: 'Badan Audit Huria', icon: Shield },
    { id: 'bendahara_seksi', label: 'Bendahara Kas / Seksi', icon: ReceiptText },
    { id: 'ketua_seksi', label: 'Ketua Seksi / Dewan', icon: CheckCircle2 },
    { id: 'pendeta_ressort', label: 'Pendeta Ressort / Pimpinan', icon: Church },
    { id: 'sekretaris', label: 'Sekretaris Huria', icon: FileText },
    { id: 'admin', label: 'Administrator Sistem', icon: Database },
  ];

  // Data Bab Buku Panduan
  const chapters = useMemo(() => [
    {
      id: 'bab-1',
      number: 'BAB I',
      title: 'Dasar Teologis, Landasan Hukum, & Konsep Akuntansi',
      subtitle: 'Aturan Peraturan HKBP 2002 Amandemen IV, Basis Kas yang Dimodifikasi, dan ISAK 35',
      roles: ['all', 'bendahara_umum', 'auditor', 'pendeta_ressort'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
            <h4 className="font-bold text-indigo-950 flex items-center gap-2 mb-1.5">
              <Church className="w-4 h-4 text-indigo-600" />
              <span>Visi dan Filosofi Pelayanan Perbendaharaan Huria</span>
            </h4>
            <p className="text-xs text-indigo-900 leading-relaxed">
              Pengelolaan perbendaharaan HKBP Hutaraja didasarkan pada prinsip teologis penatalayanan yang jujur, transparan, tertib, dan akuntabel di hadapan Tuhan dan jemaat (1 Korintus 4:2, 2 Korintus 8:20-21). Aplikasi SIKU (Sistem Informasi Keuangan Huria) dirancang khusus untuk memadukan ketetapan gerejawi HKBP dengan standar akuntansi modern tanpa menghilangkan kemudahan bagi para pelayan (Parhalado).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2 text-indigo-700">
                <FileCheck className="w-4 h-4" />
                <span>1. Rujukan Aturan & Peraturan HKBP 2002</span>
              </h5>
              <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-600">
                <li><strong>Pasal 1, 4, 5, 6</strong>: Struktur Jemaat, Parhalado Partohonan, dan Seksi Kategorial.</li>
                <li><strong>Pasal 7 & 44</strong>: Pembentukan Badan Audit Huria (3 orang anggota independen: 1 ketua, 2 anggota) dengan tugas memeriksa perbendaharaan dan verifikasi berkala.</li>
                <li><strong>Pasal 42 & 43</strong>: Wewenang Pendeta Ressort, Sekretaris Huria, Bendahara Huria, dan Parartaon (Majelis Perbendaharaan).</li>
              </ul>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
              <h5 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-2 text-emerald-700">
                <Scale className="w-4 h-4" />
                <span>2. Basis Kas Dimodifikasi & Standar ISAK 35</span>
              </h5>
              <ul className="text-xs space-y-1.5 list-disc pl-4 text-slate-600">
                <li><strong>Basis Kas</strong>: Pendapatan dan beban utama diakui saat kas fisik / bank diterima atau dikeluarkan.</li>
                <li><strong>Modifikasi Akuntansi</strong>: Mencakup pengakuan posisi Aset Tetap / Inventaris, Panjar Kegiatan, serta Piutang dan Utang jangka pendek.</li>
                <li><strong>Penyajian ISAK 35</strong>: Mengklasifikasikan dana ke dalam <em>Dana Tidak Terikat</em> (Operasional Huria) dan <em>Dana Terikat</em> (Pembangunan, Diakonia, Titipan Sinode/Ressort).</li>
              </ul>
            </div>
          </div>

          <div className="border-l-4 border-amber-400 pl-4 py-2 bg-amber-50/50 rounded-r-xl text-xs text-amber-900">
            <strong>Kunci Integritas:</strong> Tidak ada transaksi yang boleh disahkan tanpa bukti otentik (kuitansi bermeterai/cap toko, nota asli, atau tanda tangan penerima). Setiap pengeluaran di atas plafon memerlukan persetujuan berjenjang.
          </div>
        </div>
      ),
    },
    {
      id: 'bab-2',
      number: 'BAB II',
      title: 'Struktur Pengguna, Peran Gerejawi, & Independensi Audit',
      subtitle: 'Hak Akses Parhalado, Bendahara, Dewan, Seksi, dan Pemisahan Tugas (Segregation of Duties)',
      roles: ['all', 'admin', 'auditor', 'bendahara_umum'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            SIKU menerapkan pembagian peran yang ketat sesuai hukum gereja HKBP untuk menjamin keamanan kas dan mencegah konflik kepentingan.
          </p>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-800 font-semibold">
                <tr>
                  <th className="p-3">Peran Gerejawi</th>
                  <th className="p-3">Pemegang Akun</th>
                  <th className="p-3">Wewenang Utama di Aplikasi</th>
                  <th className="p-3">Batasan Penting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Pendeta Ressort</td>
                  <td className="p-3">Pdt. Ressort / Ketua Parartaon</td>
                  <td className="p-3">Menerima laporan semester tertulis, menyetujui anggaran APBG, menandatangani LPJ Tahunan.</td>
                  <td className="p-3 text-rose-600">Bukan operator pencatat kuitansi teknis.</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Sekretaris Huria</td>
                  <td className="p-3">Sekretaris Jemaat</td>
                  <td className="p-3">Meneruskan laporan berkala resmi, menyusun draf warta jemaat hasil pembukuan semesteran.</td>
                  <td className="p-3 text-rose-600">Tidak memegang kas fisik/rekening.</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Bendahara Huria (Umum)</td>
                  <td className="p-3">Bendahara Pusat Huria</td>
                  <td className="p-3">Mengelola Kas Induk, bank, tutup buku bulanan, penyusunan draf LPJ ISAK 35, CaLK, dan rekonsiliasi.</td>
                  <td className="p-3 text-rose-600">Dilarang merangkap Badan Audit.</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Bendahara Seksi / Kas Khusus</td>
                  <td className="p-3">Bendahara Kategorial / Panitia</td>
                  <td className="p-3">Menginput transaksi penerimaan/pengeluaran kas seksi (status Draft), mengajukan panjar kegiatan.</td>
                  <td className="p-3 text-rose-600">Memerlukan persetujuan Ketua Seksi.</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Ketua Seksi / Ketua Dewan</td>
                  <td className="p-3">Ketua Kategorial / Dewan</td>
                  <td className="p-3">Menyetujui (approval) pengeluaran kas seksi dan pertanggungjawaban panjar.</td>
                  <td className="p-3 text-rose-600">Hanya pada kas yang dinaunginya.</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Badan Audit Huria</td>
                  <td className="p-3">1 Ketua & 2 Anggota Independen</td>
                  <td className="p-3">Verifikasi tiap transaksi berkala (TW, Semester, Tahunan), opname fisik kas, berita acara audit 2/3 suara.</td>
                  <td className="p-3 text-rose-600">Dilarang merangkap bendahara/ketua kas mana pun!</td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-3 font-semibold text-slate-900">Administrator Sistem</td>
                  <td className="p-3">Admin TI Huria</td>
                  <td className="p-3">Kelola akun pengguna, data master kas, tempat penyimpanan, pengaturan kop surat, audit log.</td>
                  <td className="p-3 text-rose-600">Tidak mengeksekusi uang kas riil.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-rose-50 border border-rose-200/80 rounded-2xl space-y-2">
            <h5 className="font-bold text-rose-950 text-xs flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-rose-600" />
              <span>Prinsip Independensi Mutlak Badan Audit Huria (Pasal 7 AP HKBP)</span>
            </h5>
            <p className="text-xs text-rose-900 leading-relaxed">
              Sistem secara otomatis mengunci validasi database: seorang anggota Badan Audit Huria yang aktif <strong>TIDAK BISA</strong> dijadikan Bendahara Umum, Pendeta Ressort, Sekretaris Huria, maupun pengurus kas/seksi mana pun. Hal ini untuk mencegah praktik audit atas pekerjaan sendiri (<em>self-review threat</em>).
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-3',
      number: 'BAB III',
      title: 'Data Master: Kas Huria, Rekening Bank, & Pengguna',
      subtitle: 'Pengelolaan Entitas Kas, Klasifikasi Dana Terikat/Tidak Terikat, dan Penonaktifan Aman',
      roles: ['all', 'admin', 'bendahara_umum'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Menu <strong>Data Master</strong> hanya dapat diakses oleh Administrator dan Bendahara Umum. Menu ini menjadi pondasi seluruh pencatatan keuangan.
          </p>

          <div className="space-y-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-2 text-indigo-700">
                <Database className="w-4 h-4" />
                <span>A. Klasifikasi Dana pada Kas Huria</span>
              </h4>
              <p className="text-xs text-slate-600 mb-3">
                Sesuai standar ISAK 35, setiap kas huria harus ditentukan jenis dananya:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <span className="font-bold text-emerald-900 block mb-1">1. Dana Tidak Terikat (Unrestricted)</span>
                  <p className="text-emerald-800">
                    Kas Umum Huria yang penggunaannya leluasa untuk kegiatan rutin ibadah, operasional, honorarium pelayan, listrik/air, dan pemeliharaan umum gereja.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50/70 border border-purple-200">
                  <span className="font-bold text-purple-900 block mb-1">2. Dana Terikat (Restricted)</span>
                  <p className="text-purple-800">
                    Kas yang penggunaannya dibatasi oleh amanah pemberi dana atau keputusan Sinode/Rapat Huria: Kas Pembangunan Gedung Gereja, Kas Diakonia Sosial, Kas Amanah Titipan Sentralisasi.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
                <span>B. Panduan Edit dan Hapus Data Master Kas</span>
              </h4>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                <li>
                  <strong>Mengedit Kas:</strong> Klik tombol <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">Edit</span> pada kartu kas. Anda dapat mengganti nama kas, deskripsi, jenis dana, dan mengaktifkan/menonaktifkan kas.
                </li>
                <li>
                  <strong>Menghapus Kas (Perlindungan Akuntansi):</strong> Klik tombol <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-mono text-[11px]">Hapus</span>.
                  <div className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-600">
                    <em>Perhatian Integritas:</em> Jika kas tersebut <strong>sudah pernah memiliki transaksi, saldo awal, aset tetap, atau panjar kegiatan</strong>, sistem secara otomatis melarang penghapusan permanen (hard-delete) guna mencegah kerusakan buku besar. Sebagai gantinya, sistem menyediakan tombol <strong>"Nonaktifkan Kas"</strong> sehingga riwayat pembukuan masa lalu tetap utuh.
                  </div>
                </li>
              </ul>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-white">
              <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-2 text-blue-700">
                <Users className="w-4 h-4" />
                <span>C. Menambah Pengguna Baru dengan Jabatan Gerejawi HKBP</span>
              </h4>
              <p className="text-xs text-slate-600 mb-2">
                Buka tab <strong>Pengguna & Pelayan Huria</strong>, lalu klik <strong>"Tambah Pengguna Baru"</strong>:
              </p>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal pl-4">
                <li>Masukkan Nama Lengkap beserta Gelar Gerejawi (misal: <em>St. Robert Simanjuntak, S.T.</em>).</li>
                <li>Pilih <strong>Peran Struktural HKBP</strong> (misal: <em>Sintua Wijk / Parhalado</em>, <em>Bendahara Huria</em>, <em>Badan Audit</em>, dll.).</li>
                <li>Pilih <strong>Tohonan Tahbisan</strong> (Pendeta, Guru Huria, Bibelvrouw, Diakones, Evangelis, Sintua, atau Non-Tahbisan).</li>
                <li>Pilih <strong>Tingkat Pelayanan</strong> (Tingkat Huria atau Tingkat Ressort) dan <strong>Wijk</strong> jika bertugas di lingkungan jemaat.</li>
                <li>Klik <strong>Simpan Pengguna</strong>. Profil baru langsung aktif dan dapat digunakan.</li>
              </ol>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-4',
      number: 'BAB IV',
      title: 'Penyusunan Anggaran (APBG Huria) & Realokasi',
      subtitle: 'Perencanaan Pendapatan, Pos Belanja, Ambang Batas Selisih (Varians), dan Pergeseran Anggaran',
      roles: ['all', 'bendahara_umum', 'pendeta_ressort'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Anggaran Pendapatan dan Belanja Huria (APBG) disusun setiap akhir tahun untuk tahun pelayanan berikutnya, disahkan dalam Rapat Parhalado/Sinode Huria.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block mb-1">1. Pos Penerimaan</span>
              <p className="text-slate-600">
                Pelean I (Ibadah Minggu), Pelean II, Pelean Bulanan/Keluarga, Pelean Perpuluhan, Ucapan Syukur (Hamauliateon), Pesta Gotilon, dan Janji Iman Pembangunan.
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block mb-1">2. Pos Pengeluaran</span>
              <p className="text-slate-600">
                Belanja Ibadah & Altar, Pelayanan Koinonia (Sekolah Minggu s.d. Lansia), Marturia (Zending/Musik), Diakonia Sosial, Operasional Gedung, dan Setoran Sentralisasi ke Hatopan.
              </p>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <span className="font-bold text-slate-900 block mb-1">3. Pemantauan Realisasi</span>
              <p className="text-slate-600">
                Setiap transaksi kas yang disetujui otomatis memperbarui persentase realisasi anggaran. Sistem menandai pos belanja yang melebihi pagu dengan warna merah.
              </p>
            </div>
          </div>

          {/* Kotak Contoh Kasus Praktis */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Contoh Kasus 1: Pergeseran / Realokasi Anggaran Antar-Pos</span>
              </span>
              <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Studi Kasus Nyata</span>
            </div>
            <div className="text-xs text-slate-700 space-y-2">
              <p>
                <strong>Kondisi:</strong> Pada bulan Agustus, pos <em>Belanja Lilin & Perlengkapan Altar</em> memiliki sisa anggaran Rp 3.000.000, sementara pos <em>Belanja Perbaikan Sound System</em> kekurangan dana sebesar Rp 2.000.000 karena terjadi kerusakan mic mimbar.
              </p>
              <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                <p>• Buka menu <strong>Anggaran (APBG)</strong> &rarr; Klik <strong>"Realokasi Anggaran"</strong>.</p>
                <p>• Pos Sumber: <em>Belanja Perlengkapan Ibadah</em> (Pagu dikurangi Rp 2.000.000).</p>
                <p>• Pos Tujuan: <em>Belanja Pemeliharaan Sound System</em> (Pagu ditambah Rp 2.000.000).</p>
                <p>• Alasan Realokasi: <em>"Kerusakan mendesak mikrofon mimbar utama sesuai persetujuan Pendeta Ressort"</em>.</p>
                <p>• Klik <strong>Simpan Realokasi</strong>. Seluruh riwayat perubahan tercatat rapi di Audit Trail.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-5',
      number: 'BAB V',
      title: 'Pencatatan Transaksi Kas: Penerimaan, Belanja, & Transfer',
      subtitle: 'Siklus Draft, Otorisasi Persetujuan Ketua Seksi, Transfer Antar-Tempat Simpan, dan Transaksi Pembalik',
      roles: ['all', 'bendahara_umum', 'bendahara_seksi', 'ketua_seksi'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Transaksi kas adalah inti harian aplikasi. Semua aliran uang fisik maupun perbankan wajib dicatat dengan bukti terlampir.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-indigo-700">
                <ReceiptText className="w-4 h-4" />
                <span>A. Alur Persetujuan Transaksi (Segregation of Duties)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-center text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="font-bold text-slate-800 block mb-1">1. Penginputan (Draft)</span>
                  <p className="text-[11px] text-slate-500">
                    Bendahara Seksi menginput nominal, tanggal, kategori pos, kas penerima/pengeluar, dan bukti nota/kuitansi.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="font-bold text-amber-900 block mb-1">2. Pengajuan (Submitted)</span>
                  <p className="text-[11px] text-amber-800">
                    Status transaksi diajukan ke Ketua Kas/Seksi untuk diperiksa kelayakannya.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <span className="font-bold text-emerald-900 block mb-1">3. Disetujui (Approved)</span>
                  <p className="text-[11px] text-emerald-800">
                    Ketua Kas menyetujui transaksi di menu <strong>Persetujuan Ketua</strong>. Saldo kas langsung termutasi resmi.
                  </p>
                </div>
              </div>
            </div>

            {/* Kotak Contoh Kasus Praktis */}
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Contoh Kasus 2: Penerimaan Pelean Minggu & Penyetoran ke Bank BRI Huria</span>
                </span>
                <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Alur Nyata</span>
              </div>
              <div className="text-xs text-slate-700 space-y-2">
                <p>
                  <strong>Langkah 1 (Pencatatan Pelean Tunai):</strong> Selesai kebaktian Minggu pukul 12.30 WIB, Parhalado menghitung total pelean terkumpul sebesar <strong>Rp 14.500.000</strong>.
                </p>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1">
                  <p>• Klik <strong>+ Transaksi Baru</strong> &rarr; Jenis: <em>Penerimaan</em>.</p>
                  <p>• Kas: <em>Kas Umum Huria</em> | Penyimpanan: <em>Brankas Fisik Gereja</em>.</p>
                  <p>• Kategori: <em>Pelean Ibadah Minggu (Kolekte)</em> | Nominal: <em>Rp 14.500.000</em>.</p>
                  <p>• Keterangan: <em>Pelean Ibadah Minggu Rogate, 10 Mei 2026 (Kebaktian I & II)</em>.</p>
                  <p>• Klik <strong>Simpan Transaksi</strong>.</p>
                </div>

                <p>
                  <strong>Langkah 2 (Transfer / Setor Tunai ke Bank BRI):</strong> Hari Senin pagi, Bendahara menyetorkan uang tunai sebesar <strong>Rp 12.000.000</strong> ke rekening Bank BRI Huria, menyisakan Rp 2.500.000 di brankas untuk operasional.
                </p>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1">
                  <p>• Klik <strong>Transfer Antar Kas / Simpanan</strong> di bilah atas.</p>
                  <p>• Penyimpanan Asal: <em>Brankas Fisik Gereja</em> &rarr; Penyimpanan Tujuan: <em>Bank BRI Huria (Rek. 0123-xxx)</em>.</p>
                  <p>• Nominal: <em>Rp 12.000.000</em> | Bukti Slip Setoran Bank terlampir.</p>
                  <p>• Klik <strong>Proses Transfer</strong>. Saldo brankas berkurang Rp 12.000.000 dan saldo Bank BRI bertambah Rp 12.000.000 tanpa mempengaruhi laporan laba-rugi.</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl">
              <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center gap-2 text-rose-700">
                <ArrowRightLeft className="w-4 h-4" />
                <span>B. Koreksi Kesalahan Transaksi (Transaksi Pembalik / Reversal)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Demi mempertahankan asas akuntabilitas dan audit trail, transaksi yang <strong>sudah disetujui (Approved) tidak boleh dihapus secara diam-diam</strong>. Jika terjadi salah ketik nominal atau salah kategori, gunakan tombol <strong>"Buat Pembalik (Reversal)"</strong>. Sistem akan membuat transaksi kontra otomatis dengan nominal minus dan alasan pembatalan resmi, lalu Anda dapat menginput transaksi yang benar.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-6',
      number: 'BAB VI',
      title: 'Data Pendukung LPJ: Inventaris Aset, Panjar, & Piutang/Utang',
      subtitle: 'Prinsip Basis Kas Dimodifikasi: Penatausahaan Harta Huria, Panjar Panitia, dan CaLK',
      roles: ['all', 'bendahara_umum', 'bendahara_seksi', 'auditor'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Menu <strong>Data Pendukung LPJ</strong> menyediakan 4 pilar modifikasi kas yang dibutuhkan laporan pertanggungjawaban standar ISAK 35.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-indigo-900 text-xs flex items-center gap-2">
                <FolderArchive className="w-4 h-4 text-indigo-600" />
                <span>1. Inventaris & Aset Tetap Huria</span>
              </h4>
              <p className="text-xs text-slate-600">
                Mencatat tanah gereja, bangunan gereja/pastori, kendaraan dinas, alat musik/sound system, dan peralatan kantor. Dilengkapi:
              </p>
              <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                <li>Tanggal & nilai perolehan asli.</li>
                <li>Penyusutan garis lurus otomatis berdasarkan masa manfaat.</li>
                <li>Penautan belanja transaksi pengeluaran langsung ke buku inventaris.</li>
                <li>Penghapusan/hibah aset wajib persetujuan ketua kas & alasan resmi.</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-amber-900 text-xs flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                <span>2. Panjar / Uang Muka Kegiatan</span>
              </h4>
              <p className="text-xs text-slate-600">
                Pemberian dana di muka kepada panitia kategorial (Panitia Paskah, Natal, Pesta Gotilon, Parheheon).
              </p>
              <ul className="text-xs text-slate-600 list-disc pl-4 space-y-1">
                <li>Wajib mencantumkan nama penerima, nominal, dan batas waktu LPJ.</li>
                <li>Panjar yang melewati batas waktu otomatis ditandai merah (*Overdue*).</li>
                <li>Pertanggungjawaban panjar mencatat realisasi belanja, sisa dikembalikan, atau kekurangan diganti.</li>
              </ul>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-900 text-xs flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>3. Piutang & Utang Huria</span>
              </h4>
              <p className="text-xs text-slate-600">
                Pencatatan piutang sewa aula jemaat, piutang panjar belum selesai, atau utang pembelian material pembangunan gereja ke toko bahan bangunan yang dilunasi bertahap.
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-purple-900 text-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <span>4. Catatan atas Laporan Keuangan (CaLK)</span>
              </h4>
              <p className="text-xs text-slate-600">
                Diisi oleh Bendahara Umum, berisi narasi kebijakan akuntansi, penjelasan selisih anggaran signifikan (lebih dari 10%), penjelasan dana terikat pembangunan, dan kejadian luar biasa setelah tanggal neraca.
              </p>
            </div>
          </div>

          {/* Kotak Contoh Kasus Praktis */}
          <div className="p-4 bg-slate-50 border border-slate-300 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Contoh Kasus 3: Pencairan Panjar Panitia Natal & Penyelesaiannya</span>
              </span>
              <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Alur Nyata</span>
            </div>
            <div className="text-xs text-slate-700 space-y-2">
              <p>
                <strong>1. Pencairan Uang Muka:</strong> Tanggal 1 Desember, Bendahara Huria menyerahkan uang muka operasional sebesar <strong>Rp 5.000.000</strong> kepada Ketua Panitia Natal (St. B. Siregar) dengan batas waktu LPJ 31 Desember.
              </p>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1">
                <p>• Buka menu <strong>Data Pendukung LPJ</strong> &rarr; Tab <strong>Panjar / Uang Muka</strong>.</p>
                <p>• Klik <strong>+ Catat Panjar Baru</strong>.</p>
                <p>• Penerima: <em>St. B. Siregar (Panitia Natal)</em> | Nominal: <em>Rp 5.000.000</em>.</p>
                <p>• Kas Sumber: <em>Kas Umum Huria</em> | Batas Waktu: <em>31 Desember 2026</em>.</p>
              </div>

              <p>
                <strong>2. Pertanggungjawaban (Realisasi Rp 4.650.000, Sisa Rp 350.000 Dikembalikan):</strong> Tanggal 28 Desember, Panitia menyerahkan bundel kuitansi pengeluaran total Rp 4.650.000 dan mengembalikan sisa uang tunai Rp 350.000 ke kas induk.
              </p>
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-[11px] font-mono space-y-1">
                <p>• Pada baris panjar tersebut, klik tombol <strong>"Pertanggungjawaban / Selesai"</strong>.</p>
                <p>• Masukkan Realisasi Belanja: <em>Rp 4.650.000</em> (rincian nota konsumsi & dekorasi dilampirkan).</p>
                <p>• Sisa Dikembalikan: <em>Rp 350.000</em> &rarr; Masuk kembali ke Brankas Kas Umum Huria.</p>
                <p>• Klik <strong>Selesaikan Panjar</strong>. Status panjar berubah menjadi <em>Selesai (Settled)</em> dan tidak menjadi piutang menggantung pada laporan akhir tahun.</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-7',
      number: 'BAB VII',
      title: 'Badan Audit Huria: Verifikasi Transaksi Berkala & Berita Acara',
      subtitle: 'Uji Keabsahan Bukti Kuitansi, 6 Poin Kepatuhan Formal AP HKBP, Opname Kas, dan Musyawarah 2/3 Suara',
      roles: ['all', 'auditor', 'bendahara_umum', 'pendeta_ressort'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
            <h4 className="font-bold text-indigo-950 flex items-center gap-2 mb-1.5">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Mandat Badan Audit Huria HKBP (3 Orang Independen)</span>
            </h4>
            <p className="text-xs text-indigo-900 leading-relaxed">
              Sesuai Aturan Peraturan HKBP 2002 Pasal 7 & 44, Badan Audit Huria bertugas melakukan pemeriksaan fisik dan pembukuan secara berkala (Triwulan I–IV, Semester I–II, dan LPJ Tahunan). Pemeriksaan tidak hanya sekadar memberikan opini kewajaran umum di akhir tahun, melainkan <strong>menguji setiap transaksi dan keabsahan kuitansi pendukungnya</strong>.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-indigo-700">
                <FileCheck className="w-4 h-4" />
                <span>A. Langkah Kerja Memverifikasi Transaksi Kas</span>
              </h4>
              <ol className="text-xs text-slate-600 space-y-2 list-decimal pl-4">
                <li>
                  Buka menu <strong>Badan Audit Huria</strong> &rarr; Pilih tab <strong>"Verifikasi Transaksi"</strong>.
                </li>
                <li>
                  Gunakan filter periode (misal: <em>Triwulan II (Apr - Jun)</em>) dan filter Kas.
                </li>
                <li>
                  Periksa setiap baris transaksi: periksa kesesuaian tanggal, nominal pada kuitansi fisik/foto lampiran, cap toko, dan tanda tangan pelayan yang berhak.
                </li>
                <li>
                  Bila bukti transaksi valid dan lengkap, klik tombol <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded text-[11px]">✓ Lolos</span>.
                </li>
                <li>
                  Bila ada ketidakcocokan atau kuitansi asli hilang, klik tombol <span className="bg-amber-50 text-amber-700 font-semibold px-2 py-0.5 rounded text-[11px]">⚠ Temuan</span>. Isi judul temuan, catatan kekurangan, dan batas waktu perbaikan. Transaksi akan ditandai berstatus temuan audit.
                </li>
              </ol>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-indigo-700">
                <Award className="w-4 h-4" />
                <span>B. Pemeriksaan Berkala & 6 Poin Kepatuhan Formal AP HKBP</span>
              </h4>
              <p className="text-xs text-slate-600">
                Di tab <strong>"Pemeriksaan Berkala"</strong>, ketiga anggota Badan Audit mengevaluasi 6 poin kepatuhan wajib:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>1. Kecocokan saldo fisik brankas & rekening bank (Berita Acara Opname).</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>2. Keabsahan bukti pengeluaran & kuitansi otentik bermeterai/cap.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>3. Kepatuhan pelaksanaan belanja sesuai pagu pos APBG Huria.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>4. Pertanggungjawaban panjar tepat waktu tanpa piutang menggantung.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>5. Kepatuhan penyetoran dana titipan huria / sentralisasi ke Hatopan.</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>6. Penuntasan tindak lanjut atas temuan audit periode sebelumnya.</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <h4 className="font-bold text-emerald-950 text-xs flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-700" />
                <span>C. Keputusan Kolegial 2/3 Suara & Berita Acara Resmi</span>
              </h4>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Ketua Badan Audit <strong>tidak dapat menetapkan opini sendirian</strong>. Opini sah dan Berita Acara Pemeriksaan baru dapat diterbitkan bila minimal <strong>2 dari 3 anggota</strong> telah membubuhkan tanda tangan verifikasi digital pada aplikasi. Klik <strong>"Pratinjau & Cetak Berita Acara"</strong> untuk mencetak dokumen resmi ber-Kop Huria.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-8',
      number: 'BAB VIII',
      title: 'Tutup Buku Kas Bulanan & Rekonsiliasi Bank',
      subtitle: 'Pemeriksaan Transaksi Gantung, Penyesuaian Bunga/Biaya Administrasi Bank, dan Penguncian Buku',
      roles: ['all', 'bendahara_umum', 'admin'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Tutup buku dilakukan setiap akhir bulan oleh Bendahara Umum untuk memastikan tidak ada transaksi yang terlewat dan angka buku kas sinkron dengan rekening bank.
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-indigo-700">
                <Lock className="w-4 h-4" />
                <span>A. Prosedur Tutup Buku Kas Bulanan</span>
              </h4>
              <ol className="text-xs text-slate-600 space-y-1.5 list-decimal pl-4">
                <li>Buka menu <strong>Tutup Buku</strong>.</li>
                <li>Periksa indikator <em>Transaksi Gantung</em>: pastikan tidak ada transaksi berstatus Draft atau Diajukan pada bulan bersangkutan.</li>
                <li>Lakukan rekonsiliasi seluruh tempat penyimpanan (kas tunai & rekening bank).</li>
                <li>Bila semua syarat terpenuhi, klik <strong>"Kunci Buku Kas Bulan Ini"</strong>.</li>
                <li>Setelah dikunci, tidak ada yang dapat menambah atau mengedit transaksi pada bulan tersebut tanpa persetujuan buka kunci resmi.</li>
              </ol>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-emerald-700">
                <Calculator className="w-4 h-4" />
                <span>B. Rekonsiliasi Bank (Bank Reconciliation)</span>
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bandingkan saldo di buku kas Bank BRI/Mandiri aplikasi dengan <em>Rekening Koran</em> fisik bank:
              </p>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-xs space-y-1 text-slate-700">
                <p>Saldo Buku Kas SIKU + Bunga Bank - Biaya Administrasi Bank = Saldo Rekening Koran Bank</p>
              </div>
              <p className="text-xs text-slate-600">
                Catat pendapatan bunga bank dan beban administrasi bulanan lewat menu Transaksi agar saldo buku kas dan saldo rekening bank 100% klop (selisih = Rp 0).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-9',
      number: 'BAB IX',
      title: 'Penyusunan Laporan Semester & LPJ Tahunan (ISAK 35)',
      subtitle: 'Siklus 5 Tahap Laporan Semester, Penguncian Snapshot, Penerusan ke Pendeta, dan Warta Jemaat',
      roles: ['all', 'bendahara_umum', 'sekretaris', 'pendeta_ressort', 'auditor'],
      content: (
        <div className="space-y-6 text-sm text-slate-700 leading-relaxed">
          <p className="text-xs text-slate-600">
            Menu <strong>Laporan & LPJ ISAK 35</strong> menyajikan laporan pertanggungjawaban lengkap yang siap disajikan ke Rapat Parhalado, Rapat Huria, dan jemaat.
          </p>

          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-indigo-700">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Siklus 5 Tahap Penerbitan Laporan Semester Huria</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-bold text-slate-800 block mb-1">1. Persiapan</span>
                <p className="text-[10px] text-slate-500">Menjalankan checklist pra-syarat semester (bulan ditutup, panjar beres).</p>
              </div>
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="font-bold text-indigo-900 block mb-1">2. Disusun</span>
                <p className="text-[10px] text-indigo-800">Kunci snapshot angka agar tidak berubah oleh mutasi berikutnya.</p>
              </div>
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <span className="font-bold text-amber-900 block mb-1">3. Diperiksa</span>
                <p className="text-[10px] text-amber-800">Badan Audit memeriksa & menerbitkan Berita Acara Opini.</p>
              </div>
              <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg">
                <span className="font-bold text-purple-900 block mb-1">4. Ke Pendeta</span>
                <p className="text-[10px] text-purple-800">Sekretaris meneruskan berkas resmi ke Pendeta Ressort.</p>
              </div>
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="font-bold text-emerald-900 block mb-1">5. Diwartakan</span>
                <p className="text-[10px] text-emerald-800">Teks ringkasan disusun & dibacakan dalam Warta Jemaat Minggu.</p>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              <span>Komponen Dokumen Lengkap LPJ Tahunan (Format ISAK 35)</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>1. Laporan Posisi Keuangan:</strong> Aset Lancar (Kas & Bank), Aset Tetap, Panjar Belum Selesai, Kewajiban/Utang, dan Saldo Dana.
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>2. Laporan Penghasilan Komprehensif:</strong> Rincian seluruh penerimaan pelayanan huria vs pengeluaran pelayanan huria.
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>3. Laporan Perubahan Saldo Dana:</strong> Pergerakan saldo Dana Tidak Terikat vs Dana Terikat (Pembangunan/Diakonia).
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-200">
                <strong>4. Laporan Arus Kas & CaLK:</strong> Arus kas aktivitas operasi, investasi, pendanaan, serta Catatan atas Laporan Keuangan lengkap.
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'bab-10',
      number: 'BAB X',
      title: 'Tanya Jawab (FAQ) & Penyelesaian Masalah Cepat',
      subtitle: 'Pertanyaan Populer, Solusi Teknis, dan Kontak Bantuan Pengurus',
      roles: ['all', 'bendahara_seksi', 'auditor', 'admin', 'bendahara_umum'],
      content: (
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
            <p className="font-bold text-slate-900 text-xs text-indigo-700">
              T: Mengapa tombol "Hapus" pada salah satu Kas Huria tidak menghapus data secara permanen?
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>J:</strong> Ini adalah fitur pengaman integritas akuntansi. Kas yang sudah memiliki transaksi, saldo awal, aset, atau panjar dilarang dihapus permanen agar tidak merusak buku besar tahun berjalan. Sistem secara otomatis memberikan opsi <strong>"Nonaktifkan Kas"</strong> sehingga kas tidak muncul lagi pada pilihan transaksi baru, namun seluruh arsip laporan masa lalu tetap utuh.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
            <p className="font-bold text-slate-900 text-xs text-indigo-700">
              T: Mengapa saya tidak bisa menunjuk Sintua Bendahara Huria menjadi Anggota Badan Audit?
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>J:</strong> Aturan dan Peraturan HKBP Pasal 7 melarang keras perangkapan jabatan antara pemegang kas (Bendahara Umum/Kas Seksi/Pendeta) dengan Badan Audit. Sistem secara otomatis mendeteksi dan memblokir penunjukan ini demi menjaga independensi mutlak auditor huria.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
            <p className="font-bold text-slate-900 text-xs text-indigo-700">
              T: Bagaimana jika ada bukti kuitansi yang salah nominal dan transaksinya sudah disetujui (Approved)?
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>J:</strong> Jangan panik. Buka menu <strong>Transaksi Kas</strong> &rarr; cari transaksi tersebut &rarr; klik tombol <strong>"Buat Pembalik (Reversal)"</strong>. Masukkan alasan pembatalan. Sistem akan membukukan transaksi pengurang otomatis. Setelah itu, Anda dapat menginput transaksi baru dengan nominal yang benar.
            </p>
          </div>

          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-1">
            <p className="font-bold text-slate-900 text-xs text-indigo-700">
              T: Bagaimana cara mencetak Berita Acara Audit atau Laporan Semester ber-Kop Surat Resmi?
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong>J:</strong> Di setiap menu laporan dan audit berkala, tersedia tombol <strong>"Pratinjau & Cetak Dokumen"</strong> (atau tombol Cetak PDF). Sistem otomatis menyematkan Kop Resmi Huria Kristen Batak Protestan (HKBP) Ressort Hutaraja lengkap dengan nomor dokumen, tanda tangan digital para pihak, dan tanggal pengesahan.
            </p>
          </div>
        </div>
      ),
    },
  ], []);

  // Filter bab berdasarkan search query dan peran terpilih
  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      const matchRole = selectedRole === 'all' || ch.roles.includes('all') || ch.roles.includes(selectedRole);
      const matchQuery =
        searchQuery.trim() === '' ||
        ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.number.toLowerCase().includes(searchQuery.toLowerCase());
      return matchRole && matchQuery;
    });
  }, [chapters, selectedRole, searchQuery]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* ======================================================================= */}
      {/* HEADER HERO BANNER                                                      */}
      {/* ======================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-indigo-200 text-xs font-semibold">
                <BookOpen className="w-3.5 h-3.5 text-amber-300" />
                <span>Dokumentasi Resmi & Panduan Operasional Parhalado</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Buku Panduan Lengkap SIKU HKBP Hutaraja
              </h1>
              <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl leading-relaxed">
                Panduan komprehensif penatalayanan perbendaharaan huria berbasis kas yang dimodifikasi, standar ISAK 35, dan Aturan Peraturan HKBP 2002 Amandemen Keempat. Disertai contoh kasus praktis dan langkah operasional terperinci.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-102"
              >
                <Printer className="w-4 h-4 text-indigo-600" />
                <span>Cetak / Simpan PDF Panduan</span>
              </button>
            </div>
          </div>

          {/* Search Bar Input */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik panduan (mis: 'pelean', 'panjar', 'badan audit', 'reversal', 'tutup buku')..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-indigo-200 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-amber-300 focus:bg-white/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-200 hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Background Decorative Rings */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute right-1/3 -top-12 w-48 h-48 rounded-full bg-purple-500/10 blur-xl pointer-events-none" />
      </div>

      {/* ======================================================================= */}
      {/* FILTER PERAN (ROLE SELECTOR)                                            */}
      {/* ======================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Pilih Peran Pelayanan Anda (Filter Topik Relevan):</span>
          </p>
          <span className="text-[11px] text-slate-500">
            Peran aktif login: <strong className="text-indigo-700 capitalize">{currentUser?.full_name || currentUser?.role}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {roleFilters.map((rf) => {
            const Icon = rf.icon;
            const isSelected = selectedRole === rf.id;
            return (
              <button
                key={rf.id}
                onClick={() => setSelectedRole(rf.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 shrink-0 transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{rf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================================= */}
      {/* ACCORDION DAFTAR BAB BUKU PANDUAN                                       */}
      {/* ======================================================================= */}
      <div className="space-y-4">
        {filteredChapters.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-800 text-sm">Topik panduan tidak ditemukan</p>
            <p className="text-xs text-slate-500">
              Tidak ada bab yang cocok dengan pencarian "{searchQuery}". Coba gunakan kata kunci lain seperti "panjar", "kuitansi", atau "audit".
            </p>
          </div>
        ) : (
          filteredChapters.map((ch) => {
            const isOpen = openChapter === ch.id;
            return (
              <div
                key={ch.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => setOpenChapter(isOpen ? '' : ch.id)}
                  className={`w-full p-5 text-left flex items-start sm:items-center justify-between gap-4 transition-colors ${
                    isOpen ? 'bg-indigo-50/50 border-b border-indigo-100/80' : 'hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isOpen
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ch.number}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                        {ch.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
                        {ch.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                    {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-600" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {/* Accordion Body */}
                {isOpen && (
                  <div className="p-6 bg-white animate-in fade-in duration-200">
                    {ch.content}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================================= */}
      {/* KOTAK KONTAK DAN BANTUAN PARHALADO                                      */}
      {/* ======================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-1 text-center md:text-left">
          <h4 className="font-bold text-sm sm:text-base flex items-center justify-center md:justify-start gap-2 text-amber-300">
            <Church className="w-5 h-5" />
            <span>Pusat Bantuan & Layanan Penatalayanan Huria</span>
          </h4>
          <p className="text-xs text-slate-300 max-w-xl">
            Jika Parhalado atau Bendahara Seksi menemui kendala penginputan data, keraguan kategori anggaran, atau membutuhkan verifikasi fisik, silakan hubungi Bendahara Huria atau Administrator Sistem {settings.church_name}.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setOpenChapter('bab-10');
              const el = document.getElementById('bab-10');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            Buka Tanya Jawab (FAQ)
          </button>
        </div>
      </div>
    </div>
  );
};
