import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { Viagem } from "../types/database";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  MapPin,
  Calendar,
  Download,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export const Dashboard = () => {
  const { user } = useAuth();
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [selectedViagens, setSelectedViagens] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchViagens();
  }, [user]);

  const fetchViagens = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("viagens")
        .select("*")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      if (error) throw error;
      setViagens(data || []);
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("Erro de conexão. Verifique se as variáveis de ambiente do Supabase estão configuradas corretamente no AI Studio.");
      } else {
        console.error("Erro ao buscar viagens:", err);
        setError("Não foi possível carregar o histórico de viagens.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedViagens);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedViagens(newSelection);
  };

  const toggleAll = () => {
    if (selectedViagens.size === viagens.length) {
      setSelectedViagens(new Set());
    } else {
      setSelectedViagens(new Set(viagens.map(v => v.id)));
    }
  };

  const getViagensToExport = () => {
    if (selectedViagens.size > 0) {
      return viagens.filter(v => selectedViagens.has(v.id));
    }
    return viagens;
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const viagensToExport = getViagensToExport();

    // Header Background
    doc.setFillColor(37, 99, 235); // bg-blue-600
    doc.rect(0, 0, 210, 35, "F");

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("RotaLucro", 14, 18);

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório de Viagens", 14, 28);

    // Subtitle Date (Right aligned)
    doc.setFontSize(10);
    const dateText = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
    const textWidth = doc.getTextWidth(dateText);
    doc.text(dateText, 210 - 14 - textWidth, 24);

    const tableColumn = [
      "Data",
      "Origem",
      "Parada",
      "Destino",
      "KM",
      "Dias",
      "Frete",
      "Custo",
      "Lucro",
      "Margem",
    ];
    const tableRows = viagensToExport.map((v) => [
      format(new Date(v.data), "dd/MM/yyyy"),
      v.origem,
      v.parada || "-",
      v.destino,
      v.km.toFixed(1),
      v.dias,
      formatCurrency(v.valor_frete),
      formatCurrency(v.custo_total),
      formatCurrency(v.lucro),
      `${v.margem.toFixed(1)}%`,
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 45,
      theme: "striped",
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [51, 65, 85], // text-slate-700
      },
      headStyles: {
        fillColor: [37, 99, 235], // bg-blue-600
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "center" }, // Data
        4: { halign: "right" }, // KM
        5: { halign: "center" }, // Dias
        6: { halign: "right", textColor: [37, 99, 235], fontStyle: "bold" }, // Frete (Blue)
        7: { halign: "right", textColor: [220, 38, 38], fontStyle: "bold" }, // Custo (Red)
        8: { halign: "right", fontStyle: "bold" }, // Lucro
        9: { halign: "center", fontStyle: "bold" }, // Margem
      },
      didParseCell: function (data) {
        // Style positive/negative Lucro
        if (data.section === "body" && data.column.index === 8) {
          const rawLucro = viagensToExport[data.row.index].lucro;
          if (rawLucro >= 0) {
            data.cell.styles.textColor = [5, 150, 105]; // text-emerald-600
          } else {
            data.cell.styles.textColor = [220, 38, 38]; // text-red-600
          }
        }
      },
    });

    // Footer with page number
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // text-slate-400
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save("relatorio_viagens.pdf");
  };

  const exportExcel = async () => {
    const viagensToExport = getViagensToExport();

    // Create new Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "RotaLucro";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Relatório de Viagens");

    // Add Title Row
    worksheet.mergeCells("A1:J2");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = "Relatório de Viagens - RotaLucro";
    titleCell.font = { name: "Arial", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };
    titleCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // blue-600
    };

    // Add Date Subtitle
    worksheet.mergeCells("A3:J3");
    const dateCell = worksheet.getCell("A3");
    dateCell.value = `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`;
    dateCell.font = { name: "Arial", size: 10, italic: true, color: { argb: "FF64748B" } };
    dateCell.alignment = { vertical: "middle", horizontal: "right" };

    worksheet.addRow([]); // Blank row

    // Define columns
    worksheet.columns = [
      { header: "Data", key: "data", width: 12 },
      { header: "Origem", key: "origem", width: 25 },
      { header: "Parada", key: "parada", width: 20 },
      { header: "Destino", key: "destino", width: 25 },
      { header: "KM Total", key: "km", width: 12 },
      { header: "Dias", key: "dias", width: 8 },
      { header: "Valor Frete", key: "frete", width: 18 },
      { header: "Custo Total", key: "custo", width: 18 },
      { header: "Lucro", key: "lucro", width: 18 },
      { header: "Margem (%)", key: "margem", width: 15 },
    ];

    // Style Header Row (Row 5 now)
    const headerRow = worksheet.getRow(5);
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" }, // slate-800
      };
      cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "medium" },
        right: { style: "thin" }
      };
    });

    // Add Data
    viagensToExport.forEach((v) => {
      const row = worksheet.addRow({
        data: new Date(v.data),
        origem: v.origem,
        parada: v.parada || "-",
        destino: v.destino,
        km: v.km,
        dias: v.dias,
        frete: v.valor_frete,
        custo: v.custo_total,
        lucro: v.lucro,
        margem: v.margem / 100, // percentage format needs 0 to 1
      });

      // Format Data row
      row.getCell("data").numFmt = "dd/mm/yyyy";
      row.getCell("data").alignment = { horizontal: "center" };

      row.getCell("km").numFmt = "#,##0.0";
      row.getCell("dias").alignment = { horizontal: "center" };

      const currencyFormat = '"R$" #,##0.00';
      row.getCell("frete").numFmt = currencyFormat;
      row.getCell("frete").font = { bold: true, color: { argb: "FF2563EB" } }; // blue

      row.getCell("custo").numFmt = currencyFormat;
      row.getCell("custo").font = { bold: true, color: { argb: "FFDC2626" } }; // red

      const lucroCell = row.getCell("lucro");
      lucroCell.numFmt = currencyFormat;
      lucroCell.font = {
        bold: true,
        color: { argb: v.lucro >= 0 ? "FF059669" : "FFDC2626" } // green or red
      };

      const margemCell = row.getCell("margem");
      margemCell.numFmt = "0.0%";
      margemCell.alignment = { horizontal: "center" };
      if (v.margem >= 20) {
        margemCell.font = { bold: true, color: { argb: "FF059669" } };
      } else if (v.margem >= 0) {
        margemCell.font = { bold: true, color: { argb: "FFD97706" } };
      } else {
        margemCell.font = { bold: true, color: { argb: "FFDC2626" } };
      }

      // Add borders to all data cells
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFE2E8F0" } },
          left: { style: "thin", color: { argb: "FFE2E8F0" } },
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
          right: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    });

    // Write file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, "relatorio_viagens.xlsx");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const viagensDoMes = viagens.filter((v) => {
    const date = new Date(v.data);
    return (
      date.getMonth() === currentMonth && date.getFullYear() === currentYear
    );
  });

  const totalViagens = viagensDoMes.length;
  const lucroTotal = viagensDoMes.reduce((acc, curr) => acc + curr.lucro, 0);
  const kmTotal = viagensDoMes.reduce((acc, curr) => acc + curr.km, 0);
  const margemMedia =
    totalViagens > 0
      ? viagensDoMes.reduce((acc, curr) => acc + curr.margem, 0) / totalViagens
      : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <div className="flex gap-3">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            Exportar PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-start space-x-3 text-sm">
          <span>{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">
              Viagens do Mês
            </h3>
            <div className="p-2 bg-blue-50 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalViagens}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">Lucro do Mês</h3>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p
            className={`text-3xl font-bold ${lucroTotal >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(lucroTotal)}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">
              Margem Média do Mês
            </h3>
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {margemMedia.toFixed(1)}%
          </p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-500 text-sm font-medium">
              KM Rodados no Mês
            </h3>
            <div className="p-2 bg-orange-50 rounded-lg">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {kmTotal.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} km
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Histórico de Viagens
          </h2>
          {selectedViagens.size > 0 && (
            <span className="text-sm text-blue-600 font-medium">
              {selectedViagens.size} viagem(ns) selecionada(s) para exportação
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    checked={viagens.length > 0 && selectedViagens.size === viagens.length}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4">Parada</th>
                <th className="px-6 py-4">Destino</th>
                <th className="px-6 py-4 text-right">KM</th>
                <th className="px-6 py-4 text-right">Dias</th>
                <th className="px-6 py-4 text-right">Frete</th>
                <th className="px-6 py-4 text-right">Custo Total</th>
                <th className="px-6 py-4 text-right">Lucro</th>
                <th className="px-6 py-4 text-right">Margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {viagens.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-6 py-8 text-center text-slate-500"
                  >
                    Nenhuma viagem registrada ainda.
                  </td>
                </tr>
              ) : (
                viagens.map((viagem) => (
                  <tr
                    key={viagem.id}
                    className={`hover:bg-slate-50 transition-colors ${selectedViagens.has(viagem.id) ? 'bg-blue-50/50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedViagens.has(viagem.id)}
                        onChange={() => toggleSelection(viagem.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {format(new Date(viagem.data), "dd/MM/yyyy")}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {viagem.origem}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {viagem.parada || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {viagem.destino}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {viagem.km.toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {viagem.dias}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(viagem.valor_frete)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(viagem.custo_total)}
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-semibold ${viagem.lucro >= 0 ? "text-emerald-600" : "text-red-600"}`}
                    >
                      {formatCurrency(viagem.lucro)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${viagem.margem >= 20
                            ? "bg-emerald-100 text-emerald-800"
                            : viagem.margem >= 0
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                      >
                        {viagem.margem.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
