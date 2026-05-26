import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2, 
  Download, 
  Edit3, 
  Check, 
  X,
  FileSearch,
  Eye,
  Maximize2,
  Sun,
  Moon,
  Languages,
  User,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Key,
  Lock,
  EyeOff,
  Crown,
  Zap,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  Mail,
  LayoutDashboard,
  BarChart3,
  PieChart as PieIcon,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  auth, 
  loginWithGoogle, 
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout, 
  getUserProfile, 
  createUserProfile, 
  updateGeminiApiKey,
  updateNfeDigits,
  updatePlan,
  updateUserPassword,
  reauthenticate,
  incrementUsage,
  getAllUsers,
  getPlanSettings,
  updatePlanSettings,
  UserProfile as FirebaseUserProfile,
  UserProfileWithId,
  PlanSettings as FirebasePlanSettings
} from './lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChangedSafe, activateMock } from './lib/firebase';

import JSZip from 'jszip';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { PDFDocument } from 'pdf-lib';

const PLAN_LIMITS = {
  free: 10,
  basico: 50,
  pro: 250,
  enterprise: 1000
};

// Types
type Language = 'pt' | 'en';
type Theme = 'light' | 'dark';

interface ExtractionField {
  id: string;
  name: string;
  isNFe?: boolean; // Se é o campo principal de número da nota para formatação de 6 dígitos
  useForMerge?: boolean; // Se este campo deve ser usado como critério para identificar duplicados
}

interface ProcessedFile {
  id: string;
  file: File;
  fieldValues: Record<string, string>; // Valores extraídos de cada campo
  status: 'pending' | 'processing' | 'success' | 'error';
  step?: 'preparando' | 'analisando' | 'finalizando';
  errorMessage?: string;
  previewUrl: string;
  trash?: boolean;
}

const translations = {
  pt: {
    title: 'TNA DIGITAL OCR',
    subtitle: 'Soluções Inteligentes',
    processAll: 'Processar Tudo',
    processing: 'Processando...',
    upload: 'Upload',
    chooseFiles: 'Escolher Arquivos',
    dragTitle: 'Arraste seus Documentos',
    dragDesc: 'Carregue PDFs ou imagens e deixe que nossa IA identifique os dados para você renomear em massa.',
    yourQueue: 'Sua Fila',
    fileLoaded: 'arquivo carregado',
    filesLoaded: 'arquivos carregados',
    clean: 'Limpar',
    clearAll: 'Limpar Tudo',
    downloadZip: 'Download Tudo (ZIP)',
    creatingZip: 'Criando ZIP...',
    genReport: 'Gerar Relatório (PDF)',
    prefixLabel: 'Prefixo do Nome do Arquivo',
    prefixPlaceholder: 'Ex: COMPROVANTE DE ENTREGA',
    finalName: 'Nome Final',
    nfLabel: 'Ref',
    notIdentified: 'Não identificado',
    addField: 'Adicionar Campo',
    fieldName: 'Nome do Campo',
    fieldExample: 'Ex: Data, Cliente, Valor',
    fieldsConfig: 'Campos para Extração',
    patternLabel: 'Padrão de Nome do Arquivo',
    patternPlaceholder: 'Ex: {Data} - {Identificação} - {Cliente}',
    patternHelp: 'Use {Nome do Campo} para inserir o valor extraído no nome.',
    process: 'Processar',
    download: 'Download',
    retry: 'Tentar de Novo',
    remove: 'Remover arquivo',
    viewDoc: 'Visualização do Documento',
    fullPreview: 'Visualização Completa',
    close: 'Fechar',
    identifiedNumber: 'Dados Identificados',
    reportTitle: 'Relatório TNA DIGITAL OCR',
    generatedAt: 'Gerado em',
    totalDocs: 'Total de Documentos',
    success: 'Sucesso',
    failures: 'Falhas',
    renamePrefix: 'Prefixo Renomeação',
    tableHash: '#',
    tableOrig: 'Arquivo Original',
    tableResult: 'Resultado / Nome Gerado',
    tableStatus: 'Status',
    stepReading: 'Lendo arquivo...',
    stepAnalyzing: 'IA analisando...',
    stepFinalizing: 'Finalizando...',
    stepOcr: 'OCR em curso',
    errNoKey: 'API Key do Gemini não configurada.',
    loginTitle: 'Bem-vindo ao TNA OCR',
    loginDesc: 'O sistema inteligente que utiliza IA para automatizar a renomeação e organização de qualquer documento digital ou escaneado com precisão.',
    loginWithGoogle: 'Entrar com Google',
    loginEmail: 'Entrar com E-mail',
    register: 'Criar Conta',
    alreadyHaveAccount: 'Já tem uma conta? Entre agora',
    dontHaveAccount: 'Não tem conta? Cadastre-se',
    nameLabel: 'Nome Completo',
    emailLabel: 'E-mail',
    passwordLabel: 'Senha (mín. 6 caracteres)',
    forgotPassword: 'Esqueceu a senha?',
    orConnectWith: 'Ou continue com seu Google',
    loginError: 'Erro ao fazer login. Verifique seus dados.',
    registerError: 'Erro ao criar conta. Tente outro e-mail.',
    settings: 'Configurações de Conta',
    profile: 'Perfil do Usuário',
    logout: 'Sair da Conta',
    geminiKeyLabel: 'Chave API Gemini do Usuário',
    geminiKeyPlaceholder: 'Cole sua chave API aqui...',
    saveSettings: 'Gravar Configurações',
    settingsSaved: 'Escrituração de configurações concluída!',
    geminiKeyHelp: 'Para obter sua chave, acesse o Google AI Studio e crie uma nova "API Key". É gratuito e rápido.',
    getGeminiKey: 'Obter Chave API no Google AI Studio',
    nfeDigitsLabel: 'Dígitos de Formatação (Zeros à Esquerda)',
    nfeDigitsPlaceholder: 'Ex: 6 ou 9',
    nfeDigitsHelp: 'Quantidade de dígitos para preenchimento de zeros à esquerda em números identificados.',
    keyRequired: 'Configure sua chave Gemini nas configurações para processar.',
    plansTitle: 'Assinatura e Utilização',
    identification: 'Identificação',
    userName: 'Nome Completo',
    userEmail: 'E-mail de Acesso',
    selected: 'selecionados',
    selectAll: 'Selecionar Tudo',
    downloadSelected: 'Baixar Selecionados',
    deleteSelected: 'Mover para Lixeira',
    shareSelectedEmail: 'E-mail Selecionados',
    shareSelectedWhatsApp: 'WhatsApp Selecionados',
    shareEmail: 'E-mail',
    shareWhatsApp: 'WhatsApp',
    trash: 'Lixeira',
    emptyTrash: 'Esvaziar Lixeira',
    restore: 'Restaurar',
    permanentlyDelete: 'Excluir Permanentemente',
    confirmDeleteTitle: 'Confirmar Exclusão',
    confirmDeleteMsg: 'Tem certeza que deseja mover os itens selecionados para a lixeira?',
    confirmEmptyTrashMsg: 'Isso excluirá permanentemente todos os arquivos da lixeira. Esta ação não pode ser desfeita.',
    confirmPermanentDeleteMsg: 'Este arquivo será excluído permanentemente. Continuar?',
    itemsInTrash: 'itens na lixeira',
    backToList: 'Voltar para a Lista',
    batchActions: 'Ações em Massa',
    cancel: 'Cancelar Processo',
    cancelling: 'Cancelando...',
    processCancelled: 'Processamento cancelado pelo usuário.',
    yourPlan: 'Seu Plano Atual:',
    trialLimit: 'Limite de Teste (5 arquivos)',
    usageLabel: 'Uso:',
    sidebar: {
      queue: 'Fila Ativa',
      trash: 'Lixeira',
      settings: 'Configurações',
      help: 'Ajuda e Suporte',
      account: 'Minha Conta',
      dashboard: 'Dashboard',
      reports: 'Relatórios',
      scope: 'O Que Fazemos?'
    },
    dashboard: {
      title: 'Dashboard de Produtividade',
      subtitle: 'Visão geral do seu processamento',
      totalFiles: 'Arquivos Totais',
      processed: 'Processados',
      errors: 'Erros',
      pending: 'Pendentes',
      activityChart: 'Atividade por Status',
      filesByStatus: 'Arquivos por Status',
      noData: 'Sem dados para exibir ainda. Comece a processar alguns arquivos!'
    },
    reports: {
      title: 'Gestão de Relatórios',
      subtitle: 'Filtre e exporte seus volumes processados',
      filterByStatus: 'Filtrar por Status',
      all: 'Todos',
      searchFile: 'Buscar arquivo...',
      exportBtn: 'Exportar Selecionados',
      noResults: 'Nenhum resultado encontrado para os filtros selecionados.',
      startDate: 'Data Inicial',
      endDate: 'Data Final'
    },
    upgradeBtn: 'Mudar para {plan}',
    basicoPlan: 'Basico',
    proPlan: 'Pro',
    enterprisePlan: 'Enterprise',
    basicoDesc: 'Ideal para pequenas demandas e automação inicial.',
    proPrice: 'R$ 149,90/mês',
    enterprisePrice: 'R$ 199,90/mês',
    basicoPrice: 'R$ 49,90/mês',
    freePrice: 'Grátis',
    limitReached: 'Limite de teste atingido! Por favor, assine um plano Pro para continuar.',
    adminDashboard: 'Painel Admin',
    manageUsers: 'Gerenciar Usuários',
    userList: 'Lista de Usuários',
    searchUsers: 'Buscar usuários...',
    planUpdated: 'Plano atualizado com sucesso!',
    errUpdatePlan: 'Erro ao atualizar plano.',
    totalUsers: 'Total Usuários',
    activeUsers: 'Usuários Ativos',
    usage: 'Uso Total',
    editPrices: 'Editar Preços',
    savePrices: 'Salvar Preços',
    companiesCount: 'Empresas Ativas',
    revenueToReceive: 'Faturamento Estimado',
    revenueMonthly: 'Valor Mensal',
    planDistribution: 'Distribuição de Planos',
    planFree: 'Gratuito',
    planBasico: 'Basico',
    planPro: 'Profissional',
    planEnterprise: 'Corporativo',
    priceUpdated: 'Preços salvos com sucesso!',
    errUpdatePrice: 'Erro ao salvar preços.',
    errQuota: 'Limite de cota do Google atingido. Tente novamente mais tarde ou use sua própria chave API nas configurações.',
    errProcess: 'Erro ao processar arquivo',
    successBadge: 'Sucesso',
    failBadge: 'Falha',
    pendingBadge: 'Pendente',
    processDone: 'Processamento concluído!',
    duplicatesFound: '{count} documentos duplicados encontrados.',
    mergeAction: 'Mesclar Duplicados',
    mergeReviewTitle: 'Revisar Duplicados',
    mergeReviewDesc: 'Os seguintes grupos de documentos possuem a mesma identificação e podem ser mesclados.',
    confirmMerge: 'Confirmar Mesclagem',
    cancelAction: 'Cancelar',
    merging: 'Mesclando...',
    mergeConfirm: 'Deseja mesclar arquivos que possuem a mesma identificação?',
    mergeDone: 'Mesclagem concluída com sucesso!',
    mergeError: 'Erro ao mesclar arquivos.',
    mergeFieldLabel: 'Chave de Mesclagem',
    downloadStart: 'Download iniciado!',
    support: 'Suporte WhatsApp',
    welcome: 'Olá,',
    roleSuper: 'Super Usuário',
    roleAdmin: 'Administrador',
    roleUser: 'Usuário',
    accessLevel: 'Nível de Acesso',
    changePasswordTitle: 'Alterar Senha de Acesso',
    newPasswordLabel: 'Nova Senha',
    confirmNewPasswordLabel: 'Confirmar Nova Senha',
    currentPasswordLabel: 'Senha Atual (para confirmação)',
    changePasswordBtn: 'Atualizar Senha',
    pwdMismatch: 'As senhas não coincidem.',
    pwdSuccess: 'Senha alterada com sucesso!',
    pwdMinLength: 'A senha deve ter pelo menos 6 caracteres.',
    reauthRequired: 'Sua sessão expirou ou requer confirmação. Informe sua senha atual.',
    activeCompanies: 'Empresas Ativas',
    mrrLabel: 'Receita Mensal (MRR)',
    planValue: 'Valor do Plano',
    averageUsage: 'Média de Uso / Empresa',
    membershipDate: 'Início da Adesão',
    manageCompanies: 'Gerenciar Empresas e Usuários',
    shareApp: 'Compartilhar Sistema',
    shareAppDesc: 'Compartilhe o TNA Digital OCR com seus contatos e colegas.',
    shareAppSuccess: 'Link copiado para a área de transferência!',
    scope: {
      title: 'O que fazemos?',
      subtitle: 'O TNA Digital OCR é sua solução definitiva para organização documental.',
      renamerTitle: 'Renomeador Inteligente',
      renamerDesc: 'Extração automática de dados para renomeação em massa de arquivos. Você define o padrão e a IA faz o resto.',
      pdfTitle: 'Gestão de PDFs',
      pdfDesc: 'Processamento avançado de arquivos PDF e documentos escaneados, agrupando informações essenciais de forma organizada.',
      ocrTitle: 'OCR com IA Gemini',
      ocrDesc: 'Identificação precisa de campos como NF-e, Datas e Valores usando a inteligência artificial mais avançada do Google.',
    },
  },
  en: {
    title: 'TNA DIGITAL OCR',
    subtitle: 'Smart Solutions',
    processAll: 'Process All',
    processing: 'Processing...',
    upload: 'Upload',
    chooseFiles: 'Choose Files',
    dragTitle: 'Drag your Documents',
    dragDesc: 'Upload PDFs or images and let our AI identify data for bulk renaming.',
    yourQueue: 'Your Queue',
    fileLoaded: 'file loaded',
    filesLoaded: 'files loaded',
    clean: 'Clear',
    clearAll: 'Clear All',
    downloadZip: 'Download All (ZIP)',
    creatingZip: 'Creating ZIP...',
    genReport: 'Generate Report (PDF)',
    prefixLabel: 'File Name Prefix',
    prefixPlaceholder: 'Ex: DELIVERY VOUCHER',
    finalName: 'Final Name',
    nfLabel: 'Ref',
    notIdentified: 'Not identified',
    addField: 'Add Field',
    fieldName: 'Field Name',
    fieldExample: 'Ex: Date, Client, Value',
    fieldsConfig: 'Extraction Fields',
    patternLabel: 'File Name Pattern',
    patternPlaceholder: 'Ex: {Date} - {Identification} - {Client}',
    patternHelp: 'Use {Field Name} to insert the extracted value into the name.',
    process: 'Process',
    download: 'Download',
    retry: 'Retry',
    remove: 'Remove file',
    viewDoc: 'Document Preview',
    fullPreview: 'Full Preview',
    close: 'Close',
    identifiedNumber: 'Identified Data',
    reportTitle: 'TNA DIGITAL OCR Report',
    generatedAt: 'Generated at',
    totalDocs: 'Total Documents',
    success: 'Success',
    failures: 'Failures',
    renamePrefix: 'Rename Prefix',
    tableHash: '#',
    tableOrig: 'Original File',
    tableResult: 'Result / Generated Name',
    tableStatus: 'Status',
    stepReading: 'Reading file...',
    stepAnalyzing: 'AI analyzing...',
    stepFinalizing: 'Finalizing...',
    stepOcr: 'OCR in progress',
    errNoKey: 'Gemini API Key not configured.',
    loginTitle: 'Welcome to TNA OCR',
    loginDesc: 'The smart system that uses AI to automate the renaming and organization of any digital or scanned document with precision.',
    loginWithGoogle: 'Sign in with Google',
    loginEmail: 'Sign in with Email',
    register: 'Create Account',
    alreadyHaveAccount: 'Already have an account? Log in',
    dontHaveAccount: 'Don\'t have an account? Sign up',
    nameLabel: 'Full Name',
    emailLabel: 'Email',
    passwordLabel: 'Password (min. 6 chars)',
    forgotPassword: 'Forgot password?',
    orConnectWith: 'Or continue with Google',
    loginError: 'Login failed. Please check your credentials.',
    registerError: 'Registration failed. Try another email.',
    settings: 'Settings',
    profile: 'Profile',
    logout: 'Logout',
    geminiKeyLabel: 'Your Gemini API Key',
    geminiKeyPlaceholder: 'Paste your key here...',
    saveSettings: 'Save Account Settings',
    settingsSaved: 'Account configuration successfully recorded!',
    geminiKeyHelp: 'To get your key, visit Google AI Studio and create a new "API Key". It is free and fast.',
    getGeminiKey: 'Get API Key at Google AI Studio',
    nfeDigitsLabel: 'Formatting Digits (Leading Zeros)',
    nfeDigitsPlaceholder: 'Ex: 6 or 9',
    nfeDigitsHelp: 'Number of digits for padding with leading zeros on identified numbers.',
    keyRequired: 'Please configure your Gemini API Key in settings to process files.',
    plansTitle: 'Subscription & Usage',
    identification: 'Identification',
    userName: 'Full Name',
    userEmail: 'Access Email',
    selected: 'selected',
    selectAll: 'Select All',
    downloadSelected: 'Download Selected',
    deleteSelected: 'Move to Trash',
    shareSelectedEmail: 'Email Selected',
    shareSelectedWhatsApp: 'WhatsApp Selected',
    shareEmail: 'Email',
    shareWhatsApp: 'WhatsApp',
    trash: 'Trash',
    emptyTrash: 'Empty Trash',
    restore: 'Restore',
    permanentlyDelete: 'Permanently Delete',
    confirmDeleteTitle: 'Confirm Deletion',
    confirmDeleteMsg: 'Are you sure you want to move the selected items to the trash?',
    confirmEmptyTrashMsg: 'This will permanently delete all files in the trash. This action cannot be undone.',
    confirmPermanentDeleteMsg: 'This file will be permanently deleted. Continue?',
    itemsInTrash: 'items in trash',
    backToList: 'Back to List',
    batchActions: 'Batch Actions',
    cancel: 'Cancel Process',
    cancelling: 'Cancelling...',
    processCancelled: 'Processing cancelled by the user.',
    yourPlan: 'Your Current Plan:',
    trialLimit: 'Trial Limit (5 files)',
    usageLabel: 'Usage:',
    sidebar: {
      queue: 'Active Queue',
      trash: 'Trash Bin',
      settings: 'Settings',
      help: 'Help & Support',
      account: 'My Account',
      dashboard: 'Dashboard',
      reports: 'Reports',
      scope: 'What we do?'
    },
    dashboard: {
      title: 'Productivity Dashboard',
      subtitle: 'Overview of your processing activity',
      totalFiles: 'Total Files',
      processed: 'Processed',
      errors: 'Errors',
      pending: 'Pending',
      activityChart: 'Activity by Status',
      filesByStatus: 'Files by Status',
      noData: 'No data to display yet. Start processing some files!'
    },
    reports: {
      title: 'Report Management',
      subtitle: 'Filter and export your processed volumes',
      filterByStatus: 'Filter by Status',
      all: 'All',
      searchFile: 'Search file...',
      exportBtn: 'Export Selected',
      noResults: 'No results found for the selected filters.',
      startDate: 'Start Date',
      endDate: 'End Date'
    },
    upgradeBtn: 'Switch to {plan}',
    basicoPlan: 'Basic',
    proPlan: 'Pro',
    enterprisePlan: 'Enterprise',
    basicoDesc: 'Perfect for small demands and initial automation.',
    proPrice: '$29.90/mo',
    enterprisePrice: '$39.90/mo',
    basicoPrice: '$9.90/mo',
    freePrice: 'Free',
    limitReached: 'Trial limit reached! Please subscribe to a Pro plan to continue.',
    adminDashboard: 'Admin Dashboard',
    manageUsers: 'Manage Users',
    userList: 'User List',
    searchUsers: 'Search users...',
    planUpdated: 'Plan updated successfully!',
    errUpdatePlan: 'Error updating plan.',
    totalUsers: 'Total Users',
    activeUsers: 'Active Users',
    usage: 'Total Usage',
    editPrices: 'Edit Prices',
    savePrices: 'Save Prices',
    companiesCount: 'Active Companies',
    revenueToReceive: 'Estimated Revenue',
    revenueMonthly: 'Monthly Value',
    planDistribution: 'Plan Distribution',
    planFree: 'Free',
    planBasico: 'Basic',
    planPro: 'Professional',
    planEnterprise: 'Corporate',
    priceUpdated: 'Prices saved successfully!',
    errUpdatePrice: 'Error saving prices.',
    errQuota: 'Google quota limit reached. Please try again later or use your own API Key in settings.',
    errProcess: 'Error processing file',
    successBadge: 'Success',
    failBadge: 'Failed',
    pendingBadge: 'Pending',
    processDone: 'Processing complete!',
    duplicatesFound: '{count} duplicate documents found.',
    mergeAction: 'Merge Duplicates',
    mergeReviewTitle: 'Review Duplicates',
    mergeReviewDesc: 'The following groups of documents have the same identification and can be merged.',
    confirmMerge: 'Confirm Merge',
    cancelAction: 'Cancel',
    merging: 'Merging...',
    mergeConfirm: 'Do you want to merge files that have the same identification?',
    mergeDone: 'Merge completed successfully!',
    mergeError: 'Error merging files.',
    mergeFieldLabel: 'Merge Key',
    downloadStart: 'Download started!',
    support: 'WhatsApp Support',
    welcome: 'Hello,',
    roleSuper: 'Super User',
    roleAdmin: 'Administrator',
    roleUser: 'User',
    accessLevel: 'Access Level',
    changePasswordTitle: 'Change Account Password',
    newPasswordLabel: 'New Password',
    confirmNewPasswordLabel: 'Confirm New Password',
    currentPasswordLabel: 'Current Password (for confirmation)',
    changePasswordBtn: 'Update Password',
    pwdMismatch: 'Passwords do not match.',
    pwdSuccess: 'Password changed successfully!',
    pwdMinLength: 'Password must be at least 6 characters.',
    reauthRequired: 'Your session expired or requires confirmation. Please enter your current password.',
    activeCompanies: 'Active Companies',
    mrrLabel: 'Monthly Revenue (MRR)',
    planValue: 'Plan Value',
    averageUsage: 'Average Usage / Company',
    membershipDate: 'Membership Start',
    manageCompanies: 'Manage Companies & Users',
    shareApp: 'Share System',
    shareAppDesc: 'Share TNA Digital OCR with your contacts and colleagues.',
    shareAppSuccess: 'Link copied to clipboard!',
    scope: {
      title: 'What we do?',
      subtitle: 'TNA Digital OCR is your definitive solution for document organization.',
      renamerTitle: 'Smart Renamer',
      renamerDesc: 'Automatic data extraction for bulk file renaming. You define the pattern and the AI does the rest.',
      pdfTitle: 'PDF Management',
      pdfDesc: 'Advanced processing of PDF files and scanned documents, grouping essential information in an organized way.',
      ocrTitle: 'OCR with Gemini AI',
      ocrDesc: 'Prrecise identification of fields like NFe, Dates, and Values using Google\'s most advanced artificial intelligence.',
    },
  }
};


export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitLoading, setIsAuthSubmitLoading] = useState(false);
  const [activeTab, setActiveTab ] = useState<'queue' | 'trash' | 'dashboard' | 'reports' | 'admin' | 'scope'>('dashboard');
  const [userProfile, setUserProfile] = useState<FirebaseUserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [allUsers, setAllUsers] = useState<UserProfileWithId[]>([]);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [tempDisplayName, setTempDisplayName] = useState('');
  const [tempNfeDigits, setTempNfeDigits] = useState(6);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPasswordForReauth, setCurrentPasswordForReauth] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'error' | 'success'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [lang, setLang] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [planSettings, setPlanSettings] = useState<Record<string, FirebasePlanSettings>>({
    free: { price: 'Grátis', description: '' },
    basico: { price: 'R$ 49,90/mês', description: '' },
    pro: { price: 'R$ 149,90/mês', description: '' },
    enterprise: { price: 'R$ 199,90/mês', description: '' }
  });
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [tempPrices, setTempPrices] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isSuperUser = user?.email === 'contatotnadigital@gmail.com' || user?.email === 'sistematna@gmail.com';
  const isAdmin = isSuperUser;

  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedMergeGroups, setSelectedMergeGroups] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [shouldCancel, setShouldCancel] = useState(false);
  const cancelRef = useRef(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isZipping, setIsZipping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [confirmDelete, setConfirmDelete] = useState<{ show: boolean, type: 'trash' | 'empty' | 'permanent', ids: string[] }>({ show: false, type: 'trash', ids: [] });

  const handleToggleSelect = (id: string) => {
    setSelectedFileIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const visibleFilesToSelect = files
      .filter(f => activeTab === 'trash' ? f.trash : !f.trash)
      .filter(f => {
        if (activeTab !== 'queue' || statusFilter === 'all') return true;
        return f.status === statusFilter;
      });
    
    if (selectedFileIds.length === visibleFilesToSelect.length && visibleFilesToSelect.length > 0) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(visibleFilesToSelect.map(f => f.id));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedFileIds.length === 0) return;
    
    if (activeTab === 'trash') {
      setConfirmDelete({ show: true, type: 'permanent', ids: selectedFileIds });
    } else {
      setConfirmDelete({ show: true, type: 'trash', ids: selectedFileIds });
    }
  };

  const confirmAction = () => {
    if (confirmDelete.type === 'trash') {
      setFiles(prev => prev.map(f => 
        confirmDelete.ids.includes(f.id) ? { ...f, trash: true } : f
      ));
      setSelectedFileIds([]);
      showToast(lang === 'pt' ? 'Arquivos movidos para a lixeira' : 'Files moved to trash');
    } else if (confirmDelete.type === 'permanent') {
      // Revoke preview URLs for deleted files
      files.forEach(f => {
        if (confirmDelete.ids.includes(f.id) && f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
      setFiles(prev => prev.filter(f => !confirmDelete.ids.includes(f.id)));
      setSelectedFileIds([]);
    } else if (confirmDelete.type === 'empty') {
      // Revoke preview URLs for all files in trash
      files.forEach(f => {
        if (f.trash && f.previewUrl) {
          URL.revokeObjectURL(f.previewUrl);
        }
      });
      setFiles(prev => prev.filter(f => !f.trash));
      setSelectedFileIds([]);
    }
    setConfirmDelete({ show: false, type: 'trash', ids: [] });
  };

  const visibleFiles = files
    .filter(f => activeTab === 'trash' ? f.trash : !f.trash)
    .filter(f => {
      if (activeTab !== 'queue' || statusFilter === 'all') return true;
      return f.status === statusFilter;
    });

  const handleRestore = (ids: string[]) => {
    setFiles(prev => prev.map(f => 
      ids.includes(f.id) ? { ...f, trash: false } : f
    ));
    setSelectedFileIds(prev => prev.filter(id => !ids.includes(id)));
    showToast(lang === 'pt' ? 'Arquivo restaurado!' : 'File restored!');
  };

  const handleRestoreSelected = () => {
    handleRestore(selectedFileIds);
  };

  const handleEmptyTrash = () => {
    setConfirmDelete({ show: true, type: 'empty', ids: [] });
  };

  const handleDownloadSelected = async () => {
    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
    if (selectedFiles.length === 0) return;
    
    if (selectedFiles.length === 1) {
      downloadFile(selectedFiles[0]);
    } else {
      await downloadAsZip(selectedFiles);
    }
  };

  const handleProcessSelected = async () => {
    const toProcess = files.filter(f => selectedFileIds.includes(f.id) && f.status === 'pending');
    if (toProcess.length === 0) return;
    
    for (const f of toProcess) {
      processFile(f.id);
    }
  };

  const handleShareIndividualEmail = (file: ProcessedFile) => {
    const fileName = generateFileName(file);
    const details = Object.entries(file.fieldValues)
      .map(([id, val]) => {
        const field = extractionFields.find(f => f.id === id);
        return `${field?.name || id}: ${val}`;
      })
      .join('\n');
    
    const subject = encodeURIComponent(`${t.title} - ${fileName}`);
    const body = encodeURIComponent(`${lang === 'pt' ? 'Dados Identificados:' : 'Identified Data:'}\n\n${details}\n\n${lang === 'pt' ? 'Nome Sugerido:' : 'Suggested Name:'} ${fileName}`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareIndividualWhatsApp = (file: ProcessedFile) => {
    const fileName = generateFileName(file);
    const details = Object.entries(file.fieldValues)
      .map(([id, val]) => {
        const field = extractionFields.find(f => f.id === id);
        return `${field?.name || id}: ${val}`;
      })
      .join('\n');
    
    const text = encodeURIComponent(`*${t.title}*\n\n${lang === 'pt' ? '📌 Dados Identificados:' : '📌 Identified Data:'}\n${details}\n\n${lang === 'pt' ? '📄 Nome Sugerido:' : '📄 Suggested Name:'} ${fileName}`);
    
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareBatchEmail = () => {
    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
    if (selectedFiles.length === 0) return;

    let allDetails = '';
    selectedFiles.forEach((f, idx) => {
      const fileName = generateFileName(f);
      const details = Object.entries(f.fieldValues)
        .map(([id, val]) => {
          const field = extractionFields.find(f => f.id === id);
          return `${field?.name || id}: ${val}`;
        })
        .join(', ');
      allDetails += `${idx + 1}. ${fileName} (${details})\n`;
    });

    const subject = encodeURIComponent(`${t.title} - ${selectedFiles.length} ${t.filesLoaded}`);
    const body = encodeURIComponent(`${lang === 'pt' ? 'Resumo do Processamento:' : 'Processing Summary:'}\n\n${allDetails}`);
    
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handleShareBatchWhatsApp = () => {
    const selectedFiles = files.filter(f => selectedFileIds.includes(f.id));
    if (selectedFiles.length === 0) return;

    let allDetails = '';
    selectedFiles.forEach((f, idx) => {
      const fileName = generateFileName(f);
      const details = Object.entries(f.fieldValues)
        .map(([id, val]) => {
          const field = extractionFields.find(f => f.id === id);
          return `${field?.name || id}: ${val}`;
        })
        .join(', ');
      allDetails += `${idx + 1}. *${fileName}* _(${details})_\n`;
    });

    const text = encodeURIComponent(`*${t.title} - ${selectedFiles.length} ${t.filesLoaded}*\n\n${lang === 'pt' ? '📋 Resumo do Processamento:' : '📋 Processing Summary:'}\n\n${allDetails}`);
    
    window.open(`https://wa.me/?text=${text}`);
  };

  const handleShareApp = () => {
    const shareUrl = window.location.origin;
    const shareTitle = 'TNA Digital OCR';
    const shareText = t.loginDesc;

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast(t.shareAppSuccess);
      });
    }
  };

  const [fileNamePattern, setFileNamePattern] = useState('{Identificação}');
  const [extractionFields, setExtractionFields] = useState<ExtractionField[]>([
    { id: 'id-number', name: 'Identificação', isNFe: true, useForMerge: true },
    { id: 'date', name: 'Data', isNFe: false, useForMerge: false }
  ]);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const previewFile = files.find(f => f.id === previewFileId);
  const [editingPreviewFieldId, setEditingPreviewFieldId] = useState<string | null>(null);
  const [editPreviewValue, setEditPreviewValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[lang];

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthSubmitLoading(true);
    try {
      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        await registerWithEmail(email, password, name);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setAuthError(lang === 'pt' 
          ? 'Este e-mail já está em uso. Tente fazer login em vez de criar uma nova conta.' 
          : 'Email already in use. Try logging in instead of creating a new account.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setAuthError(lang === 'pt' ? 'E-mail ou senha incorretos.' : 'Invalid email or password.');
      } else if (err.code === 'auth/weak-password') {
        setAuthError(lang === 'pt' ? 'Senha muito fraca (mínimo 6 caracteres).' : 'Weak password (minimum 6 characters).');
      } else {
        setAuthError(authMode === 'login' ? t.loginError : t.registerError);
      }
    } finally {
      setIsAuthSubmitLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setAuthError(lang === 'pt' ? 'Digite seu e-mail primeiro para redefinir a senha.' : 'Enter your email first to reset password.');
      return;
    }
    setAuthError(null);
    try {
      await resetPassword(email);
      showToast(lang === 'pt' ? 'E-mail de redefinição enviado com sucesso!' : 'Password reset email sent successfully!');
    } catch (err: any) {
      console.error(err);
      setAuthError(lang === 'pt' ? 'Erro ao enviar e-mail de redefinição. Verifique o e-mail digitado.' : 'Error sending reset email. Please check the email entered.');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChangedSafe(async (firebaseUser: any) => {
      setUser(firebaseUser as FirebaseUser | null);

      // Load plan settings (publicly accessible now)
      getPlanSettings().then(settings => {
        if (Object.keys(settings).length > 0) {
          setPlanSettings(prev => ({ ...prev, ...settings }));
        }
      }).catch(err => console.error("Error loading plan settings:", err));

      if (firebaseUser) {
        let profile = await getUserProfile(firebaseUser.uid).catch(() => null);
        if (!profile) {
          // mock user or new Firebase user — build profile locally
          profile = {
            displayName: firebaseUser.displayName || name || '',
            email: firebaseUser.email || '',
            geminiApiKey: null,
            plan: 'enterprise' as const,
            usageCount: 0,
            nfeDigits: 6,
            createdAt: null,
            updatedAt: null,
          };
          createUserProfile(firebaseUser.uid, {
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || name || ''
          }).catch(() => {});
        }
        setUserProfile(profile);
        setTempApiKey(profile?.geminiApiKey || '');
        setTempDisplayName(profile?.displayName || firebaseUser.displayName || '');
        setTempNfeDigits(profile?.nfeDigits || 6);
      } else {
        setUserProfile(null);
        setActiveTab('dashboard');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const deduplicateValue = (v: string) => {
    if (!v || typeof v !== 'string') return v;
    let trimmed = v.trim();
    
    // Remove space after dash if followed by digits (e.g., "NF- 034" -> "NF-034")
    trimmed = trimmed.replace(/-\s+(\d+)/g, '-$1');
    
    // Replace multiple spaces with a single space
    trimmed = trimmed.replace(/\s+/g, ' ');

    // Case like "Controle de entrega NF-034163 034163" -> "Controle de entrega NF-034163"
    // We look for consecutive repeated words or patterns
    const words = trimmed.split(/\s+/);
    if (words.length > 1) {
      const uniqueWords: string[] = [];
      for (let i = 0; i < words.length; i++) {
        const current = words[i];
        const prev = i > 0 ? words[i-1] : null;

        let isDuplicate = false;

        if (prev) {
          // Exact match
          if (current.toLowerCase() === prev.toLowerCase() && (current.length >= 3 || /^\d+$/.test(current))) {
            isDuplicate = true;
          } 
          // Numeric match (e.g. "000123" and "123")
          else {
            const currentNum = current.replace(/[^0-9]/g, '');
            const prevNum = prev.replace(/[^0-9]/g, '');
            if (currentNum && prevNum && currentNum.length >= 3 && prevNum.length >= 3) {
              if (currentNum === prevNum || BigInt(currentNum) === BigInt(prevNum)) {
                isDuplicate = true;
              }
            }
          }
        }

        if (!isDuplicate) {
          uniqueWords.push(current);
        }
      }
      trimmed = uniqueWords.join(' ');
    }

    // Case for strings of digits only that might be internally doubled: "033839033839" -> "033839"
    if (/^\d+$/.test(trimmed) && trimmed.length >= 4) {
      for (let len = Math.floor(trimmed.length / 2); len >= 2; len--) {
        if (trimmed.length % len === 0) {
          const unit = trimmed.substring(trimmed.length - len);
          const parts = trimmed.length / len;
          let allMatch = true;
          for (let p = 0; p < parts; p++) {
            const segment = trimmed.substring(p * len, (p + 1) * len);
            // Numeric comparison for segments to handle leading zero differences if they are long
            if (segment !== unit) {
              if (segment.length >= 3 && unit.length >= 3 && BigInt(segment) !== BigInt(unit)) {
                allMatch = false;
                break;
              } else if (segment !== unit) {
                allMatch = false;
                break;
              }
            }
          }
          if (allMatch) {
            trimmed = unit;
            break;
          }
        }
      }
    }

    // Special case: full string duplication after cleanup
    if (trimmed.length >= 4 && trimmed.length % 2 === 0) {
      const mid = trimmed.length / 2;
      const first = trimmed.substring(0, mid).trim();
      const second = trimmed.substring(mid).trim();
      if (first === second && first.length > 0) return first;
    }

    return trimmed.trim();
  };

  const generateFileName = (fileItem: ProcessedFile) => {
    let name = fileNamePattern;
    const hasPlaceholders = extractionFields.some(f => name.includes(`{${f.name}}`));
    
    extractionFields.forEach(field => {
      let value = fileItem.fieldValues[field.id] || t.notIdentified;
      // Ensure the value doesn't start with a space that could cause "NF- 034"
      value = String(value).trim();
      name = name.replaceAll(`{${field.name}}`, value);
    });

    // If the user didn't use any placeholders, append the values at the end
    if (!hasPlaceholders && fileItem.status === 'success') {
      extractionFields.forEach(field => {
        const value = fileItem.fieldValues[field.id];
        if (value) {
          name += ` ${String(value).trim()}`;
        }
      });
    }

    // Replace common pattern NF- space with NF-
    name = name.replace(/NF-\s+/gi, 'NF-');

    // Final deduplication and cleaning for the whole name part before extension
    return `${deduplicateValue(name.trim())}.pdf`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []) as File[];
    if (uploadedFiles.length > 0) {
      addFiles(uploadedFiles);
    }
    event.target.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const processedFiles: ProcessedFile[] = newFiles.map(file => {
      const initialFieldValues: Record<string, string> = {};
      extractionFields.forEach(f => { initialFieldValues[f.id] = ''; });
      
      return {
        id: Math.random().toString(36).substring(7),
        file,
        fieldValues: initialFieldValues,
        status: 'pending',
        previewUrl: URL.createObjectURL(file)
      };
    });
    setFiles(prev => [...prev, ...processedFiles]);
    setStatusFilter('all');
    setSearchQuery('');
    if (activeTab !== 'queue') {
      setActiveTab('queue');
    }
  };

  const removeFile = (id: string) => {
    if (activeTab === 'trash') {
      setConfirmDelete({ show: true, type: 'permanent', ids: [id] });
    } else {
      setConfirmDelete({ show: true, type: 'trash', ids: [id] });
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64String = result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  };

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processFile = async (id: string, attempt = 0) => {
    const fileItem = files.find(f => f.id === id);
    if (!fileItem || (fileItem.status === 'processing' && attempt === 0)) return;

    if (attempt === 0) {
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'processing', step: 'preparando', errorMessage: undefined } : f));
    }

    try {
      const currentUsage = userProfile?.usageCount || 0;
      const userPlan = userProfile?.plan || 'free';
      const hasCustomKey = userProfile?.geminiApiKey && userProfile.geminiApiKey.trim().length > 10;
      const maxAllowed = PLAN_LIMITS[userPlan as keyof typeof PLAN_LIMITS] || 10;

      // Check limits: Bypassed if Admin OR has own API Key
      if (!isAdmin && !hasCustomKey && currentUsage >= maxAllowed) {
        throw new Error(t.limitReached);
      }

      const apiKey = userProfile?.geminiApiKey || '';
      
      const base64Data = await fileToBase64(fileItem.file);
      
      setFiles(prev => prev.map(f => f.id === id ? { ...f, step: attempt > 0 ? `retrying (${attempt}/3)` : 'analisando' } : f));

      const fieldsToExtract = extractionFields.map(f => f.name).join(', ');
      const prompt = `Este é um arquivo de documento digital (PDF ou imagem). Atue como um especialista em OCR e análise documental para extrair as seguintes informações: ${fieldsToExtract}.
      
      Instruções específicas para os campos:
      - Para o campo "Identificação" ou campos de número/ID: Procure labels como "Identificação", "Número", "Nº", "N.º", "Código", "ID", "Referência", "Doc nº", "Fatura nº". Extraia APENAS o valor alfanumérico ou numérico.
      - Para o campo "Data": Procure por "Data", "Emissão", "Vencimento", "Data de Competência". Use o formato DD-MM-YYYY.
      - Para nomes de empresas ou pessoas: Procure por "Razão Social", "Nome", "Emitente", "Destinatário", "Cliente".
      - Para valores: Procure por "Valor Total", "Total", "Preço", "Liquido", "Total da Nota".
      
      REGRAS GLOBAIS OBRIGATÓRIAS:
      1. NÃO inclua o nome do campo ou o rótulo (ex: "Número:", "Data:") no valor retornado. Extraia apenas o dado puro.
      2. Se for uma Nota Fiscal, priorize o número da nota para o campo de ID/Identificação.
      3. Identifique autonomamente o conteúdo mais relevante do documento que se encaixe nos campos solicitados.
      4. Retorne estritamente em formato JSON onde as chaves são os nomes exatos dos campos solicitados. 
      5. Se um campo não for encontrado, retorne null.`;
      
      const apiResponse = await fetch('/api/process-ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64: base64Data,
          mimeType: fileItem.file.type || 'application/pdf',
          prompt: prompt,
          customApiKey: apiKey
        })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Erro no processamento OCR');
      }

      const data = await apiResponse.json();
      setFiles(prev => prev.map(f => f.id === id ? { ...f, step: 'finalizando' } : f));

      const responseText = (data.text || "").trim();
      
      try {
        const extractedData = JSON.parse(responseText);
        const newFieldValues: Record<string, string> = { ...fileItem.fieldValues };
        
        let hasAtLeastOne = false;
        extractionFields.forEach(field => {
          let value = extractedData[field.name];
          if (value !== null && value !== undefined && value !== '') {
            // Remove the field name from the value if it exists (case insensitive)
            const cleanPattern = new RegExp(`^${field.name}[:\\s-]*`, 'i');
            value = String(value).replace(cleanPattern, '').trim();

            if (value) {
              // Deduplicate tokens
              value = deduplicateValue(value);
              hasAtLeastOne = true;
              
              // Custom cleaning for ID numbers
              if (field.isNFe) {
                const cleanedNumber = String(value).replace(/[^0-9]/g, '');
                const digits = userProfile?.nfeDigits || 6;
                if (cleanedNumber && cleanedNumber.length > 0) {
                  // Re-deduplicate the resulting number string if it's still doubled
                  const finalNum = deduplicateValue(cleanedNumber);
                  value = finalNum.length > digits 
                    ? finalNum.slice(-digits) 
                    : finalNum.padStart(digits, '0');
                } else if (String(value).toLowerCase().includes('identifica')) {
                  // If it contains the field name and no digits, it's a failed extraction
                  value = '';
                } else {
                  value = String(value).slice(0, 20);
                }
              }
              newFieldValues[field.id] = String(value);
            } else {
              newFieldValues[field.id] = '';
            }
          } else {
            newFieldValues[field.id] = '';
          }
        });

        if (!hasAtLeastOne) {
          throw new Error(t.notIdentified);
        }

        // Increment usage count in Firestore
        if (user?.uid) {
          await incrementUsage(user.uid);
          // Refresh profile to update UI
          const newProfile = await getUserProfile(user.uid);
          setUserProfile(newProfile);
        }

        setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'success', step: undefined, fieldValues: newFieldValues, errorMessage: undefined } : f));
      } catch (parseError: any) {
        // If it's the Error we threw (notIdentified), show it directly
        if (parseError?.message === t.notIdentified) {
          setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', step: undefined, errorMessage: t.notIdentified } : f));
        } else {
          console.error("AI Response Error:", responseText, parseError);
          setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', step: undefined, errorMessage: t.notIdentified } : f));
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorString = String(error?.message || '').toLowerCase();
      const isQuotaError = errorString.includes('429') || errorString.includes('quota') || errorString.includes('exhausted');
      
      if (isQuotaError && attempt < 3) {
        const backoff = Math.pow(2, attempt + 1) * 1000;
        setFiles(prev => prev.map(f => f.id === id ? { ...f, step: `aguardando cota... (${attempt + 1}/3)` } : f));
        await sleep(backoff);
        return processFile(id, attempt + 1);
      }

      let errorMessage = t.errProcess;
      if (isQuotaError) {
        errorMessage = t.errQuota;
      }
      
      setFiles(prev => prev.map(f => f.id === id ? { ...f, status: 'error', step: undefined, errorMessage } : f));
    }
  };

  const processAll = async () => {
    setIsProcessingAll(true);
    setShouldCancel(false);
    cancelRef.current = false;
    // Only process files that are NOT in trash
    const pendingFiles = files.filter(f => !f.trash && (f.status === 'pending' || f.status === 'error'));
    
    if (pendingFiles.length === 0) {
      setIsProcessingAll(false);
      showToast(lang === 'pt' ? 'Nenhum arquivo pendente para processar.' : 'No pending files to process.', 'info');
      return;
    }

    // Process in sequence with a small delay between files to avoid hitting rate limits too fast
    for (const f of pendingFiles) {
      if (cancelRef.current) break;
      await processFile(f.id);
      await sleep(1000);
    }
    setIsProcessingAll(false);
    setShouldCancel(false);
    cancelRef.current = false;
    showToast(t.processDone);
  };

  const getDuplicateGroups = () => {
    const mergeFields = extractionFields.filter(f => f.useForMerge);
    if (mergeFields.length === 0) return [];

    const successFiles = files.filter(f => !f.trash && f.status === 'success');
    const groups: Record<string, ProcessedFile[]> = {};

    successFiles.forEach(f => {
      const vals = mergeFields.map(field => f.fieldValues[field.id]);
      const isValid = vals.every(v => v && v !== t.notIdentified && String(v).trim() !== '');

      if (isValid) {
        const key = vals.join(' | ');
        if (!groups[key]) groups[key] = [];
        groups[key].push(f);
      }
    });

    return Object.entries(groups)
      .filter(([_, groupFiles]) => groupFiles.length > 1)
      .map(([id, groupFiles]) => ({ id, files: groupFiles }));
  };

  const handleMergeDuplicates = async () => {
    const allGroups = getDuplicateGroups();
    const groupsToMerge = allGroups.filter(g => selectedMergeGroups.includes(g.id));
    
    if (groupsToMerge.length === 0) {
      setShowMergeModal(false);
      return;
    }

    setIsMerging(true);
    setShowMergeModal(false);
    try {
      let currentFilesState = [...files];
      
      for (const group of groupsToMerge) {
        const { files: groupFiles } = group;
        
        const mergedPdf = await PDFDocument.create();
        
        for (const fileItem of groupFiles) {
          const fileBytes = await fileItem.file.arrayBuffer();
          try {
            const donorPdf = await PDFDocument.load(fileBytes);
            const copiedPages = await mergedPdf.copyPages(donorPdf, donorPdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
          } catch (e) {
            console.warn("Could not merge file as PDF:", fileItem.file.name, e);
          }
        }

        const mergedPdfBytes = await mergedPdf.save();
        const mergedBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const mergedFile = new File([mergedBlob], `${group.id.replace(/[^\w.-]/g, '_')}_merged.pdf`, { type: 'application/pdf' });

        const mainFileId = groupFiles[0].id;
        const otherIds = groupFiles.slice(1).map(f => f.id);

        currentFilesState = currentFilesState.map(f => {
          if (f.id === mainFileId) {
            if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
            return {
              ...f,
              file: mergedFile,
              previewUrl: URL.createObjectURL(mergedFile),
              status: 'success' as const
            };
          }
          return f;
        }).filter(f => !otherIds.includes(f.id));
      }

      setFiles(currentFilesState);
      setSelectedMergeGroups([]);
      showToast(t.mergeDone);
    } catch (error) {
      console.error(error);
      showToast(t.mergeError, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleClearQueue = () => {
    const currentFiles = files.filter(f => !f.trash);
    if (currentFiles.length === 0) return;
    
    setFiles(prev => prev.map(f => !f.trash ? { ...f, trash: true } : f));
    setSelectedFileIds([]);
    showToast(lang === 'pt' ? 'Fila movida para a lixeira!' : 'Queue moved to trash!');
  };

  const cancelProcessing = () => {
    setShouldCancel(true);
    cancelRef.current = true;
    showToast(t.processCancelled);
  };

  const updateFieldValue = (fileId: string, fieldId: string, newValue: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        const field = extractionFields.find(ef => ef.id === fieldId);
        let value = deduplicateValue(newValue);
        if (field?.isNFe) {
          const cleaned = value.replace(/[^0-9]/g, '');
          const digits = userProfile?.nfeDigits || 6;
          if (cleaned) {
            const finalNum = deduplicateValue(cleaned);
            value = finalNum.length > digits 
              ? finalNum.slice(-digits) 
              : finalNum.padStart(digits, '0');
          } else {
            value = newValue;
          }
        }
        return { 
          ...f, 
          status: 'success', // User manually edited, mark as success
          errorMessage: undefined,
          fieldValues: { ...f.fieldValues, [fieldId]: value } 
        };
      }
      return f;
    }));
  };

  const downloadAsZip = async (filesToZip: ProcessedFile[]) => {
    // Filter only success and NOT in trash
    const successFiles = filesToZip.filter(f => f.status === 'success' && !f.trash);
    if (successFiles.length === 0) {
      showToast(lang === 'pt' ? 'Nenhum arquivo processado com sucesso para baixar.' : 'No successfully processed files to download.', 'info');
      return;
    }

    setIsZipping(true);
    const zip = new JSZip();
    const usedNames = new Map<string, number>();

    try {
      for (const f of successFiles) {
        let fileName = generateFileName(f);
        
        // Basic sanitization
        fileName = fileName.replace(/[<>:"/\\|?*]/g, '_');

        // Handle duplicate names within the ZIP: Skip if already exists
        if (usedNames.has(fileName)) {
          continue; // Keep only the first occurrence (user requested "deixe somente 1")
        }
        usedNames.set(fileName, 1);
        
        // SAFELY READ FILE CONTENT BEFORE ADDING TO ZIP
        // This catches the "file not found" error early and gives better feedback
        try {
          const content = await f.file.arrayBuffer();
          zip.file(fileName, content);
        } catch (fileReadError) {
          console.error(`Error reading file ${f.file.name}:`, fileReadError);
          // If a file is missing, we skip it but continue with others
          continue;
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(content);
      link.href = url;
      link.download = `NOTAS_FISCAIS_IDENTIFICADAS_${new Date().getTime()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      showToast(t.downloadStart);
    } catch (error) {
      console.error("Error generating ZIP:", error);
      showToast(lang === 'pt' ? 'Erro ao gerar arquivo ZIP. Verifique se os arquivos originais ainda estão acessíveis.' : 'Error generating ZIP file. Make sure original files are still accessible.', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  const downloadAllAsZip = async () => {
    await downloadAsZip(files);
  };

  const generateReport = () => {
    const doc = new jsPDF('landscape'); // Landscape to fit more columns
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(t.reportTitle, 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${t.generatedAt}: ${new Date().toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')}`, 14, 30);
    doc.text(`${t.totalDocs}: ${files.length}`, 14, 35);
    doc.text(`${t.success}: ${files.filter(f => f.status === 'success').length}`, 14, 40);
    doc.text(`${t.failures}: ${files.filter(f => f.status === 'error').length}`, 14, 45);
    
    // Add summary of NF-e numbers
    const nfeField = extractionFields.find(f => f.isNFe);
    if (nfeField) {
      const identifiedNumbers = files
        .filter(f => f.status === 'success' && f.fieldValues[nfeField.id])
        .map(f => f.fieldValues[nfeField.id]);
      
      if (identifiedNumbers.length > 0) {
        doc.text(`${lang === 'pt' ? 'Notas Identificadas' : 'Identified Invoices'}: ${identifiedNumbers.join(', ')}`, 14, 50);
        doc.text(`${t.patternLabel}: ${fileNamePattern}`, 14, 55);
      } else {
        doc.text(`${t.patternLabel}: ${fileNamePattern}`, 14, 50);
      }
    } else {
      doc.text(`${t.patternLabel}: ${fileNamePattern}`, 14, 50);
    }

    const headers = [t.tableHash, t.tableOrig, t.tableResult, ...extractionFields.map(f => f.name), t.tableStatus];
    
    const truncateHelper = (str: string, max: number) => {
      if (!str) return "";
      if (str.length <= max) return str;
      const extIndex = str.lastIndexOf('.');
      const ext = extIndex !== -1 ? str.substring(extIndex) : '';
      const name = extIndex !== -1 ? str.substring(0, extIndex) : str;
      return name.substring(0, max - ext.length - 3) + '...' + ext;
    };

    const tableData = files.map((f, index) => {
      const generatedName = f.status === 'success' ? generateFileName(f) : '-';
      return [
        index + 1,
        truncateHelper(f.file.name, 25),
        generatedName,
        ...extractionFields.map(field => f.fieldValues[field.id] || (f.status === 'success' ? '' : '-')),
        f.status.toUpperCase()
      ];
    });

    autoTable(doc, {
      startY: nfeField && files.filter(f => f.status === 'success' && f.fieldValues[nfeField.id]).length > 0 ? 60 : 55,
      head: [headers],
      body: tableData,
      headStyles: { fillColor: [37, 99, 235] }, // blue-600
      alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, // Slightly smaller font to fit more columns
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 40 },
        2: { cellWidth: 'auto', fontStyle: 'bold' }
      }
    });

    doc.save(`RELATORIO_TNA_OCR_${new Date().getTime()}.pdf`);
  };

  const downloadFile = (fileItem: ProcessedFile) => {
    const fileName = generateFileName(fileItem);
    const link = document.createElement('a');
    // Using a fresh URL to ensure it's not revoked or expired
    const url = URL.createObjectURL(fileItem.file);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Cleanup temporary URL
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set inactive if leaving the main container
    if (e.currentTarget === e.target) {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const items = Array.from(e.dataTransfer.files) as File[];
    const droppedFiles = items.filter((f: File) => 
      f.type === 'application/pdf' || 
      f.type.startsWith('image/')
    );
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSavingSettings(true);
    try {
      // Local update for UI
      const updatedProfile = { 
        ...userProfile!, 
        geminiApiKey: tempApiKey,
        displayName: tempDisplayName,
        nfeDigits: tempNfeDigits,
        updatedAt: new Date() // local update for UI
      };
      
      // Update Firestore user profile completely using a safer approach
      const { updateProfileData } = await import('./lib/firebase');
      await updateProfileData(user.uid, {
        geminiApiKey: tempApiKey,
        displayName: tempDisplayName,
        nfeDigits: tempNfeDigits
      });

      setUserProfile(updatedProfile);
      setShowSettings(false);
      showToast(t.settingsSaved);
    } catch (error) {
      console.error(error);
      showToast(lang === 'pt' ? 'Erro ao salvar as configurações.' : 'Error saving settings.', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showToast(t.pwdMinLength, 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t.pwdMismatch, 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(newPassword);
      showToast(t.pwdSuccess, 'success');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPasswordForReauth('');
      setShowPasswordChange(false);
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/requires-recent-login') {
        showToast(t.reauthRequired, 'error');
      } else {
        showToast(error.message || 'Error updating password', 'error');
      }
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setIsAdminLoading(true);
    try {
      const usersList = await getAllUsers();
      setAllUsers(usersList);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const handleUpdateUserPlan = async (userId: string, plan: 'free' | 'basico' | 'pro' | 'enterprise') => {
    try {
      await updatePlan(userId, plan);
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u));
      showToast(lang === 'pt' ? 'Plano atualizado!' : 'Plan updated!');
    } catch (error) {
      console.error(error);
      showToast(lang === 'pt' ? 'Erro ao atualizar plano.' : 'Error updating plan.', 'error');
    }
  };

  const handleUpdatePlanPrice = async (plan: string, price: string) => {
    try {
      await updatePlanSettings(plan, { price });
      setPlanSettings(prev => ({ 
        ...prev, 
        [plan]: { ...prev[plan], price } 
      }));
      showToast(t.priceUpdated);
    } catch (error) {
      console.error(error);
      showToast(t.errUpdatePrice, 'error');
    }
  };

  if (isAuthLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0F172A] text-white' : 'bg-[#F8FAFC] text-slate-900'}`}>
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col items-center justify-center p-6 ${theme === 'dark' ? 'bg-[#0F172A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
         {/* Mode Toggles in Login */}
         <div className="absolute top-6 right-6 flex items-center gap-2">
            <button 
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {lang === 'pt' ? (
                <>
                  <span className="text-base">🇧🇷</span>
                  <span>PT</span>
                </>
              ) : (
                <>
                  <span className="text-base">🇺🇸</span>
                  <span>EN</span>
                </>
              )}
            </button>

            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
         </div>

         <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl transition-all ${theme === 'dark' ? 'bg-slate-900 border border-slate-800 shadow-black/20' : 'bg-white border border-slate-200 shadow-slate-200/50'}`}
         >
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`p-4 rounded-2xl shadow-lg mb-4 ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-900'}`}>
                <FileSearch className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight mb-2">{t.title}</h1>
              <p className="text-slate-500 font-medium">{t.loginDesc}</p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4 mb-6">
              {authMode === 'register' && (
                <div className="space-y-1 text-left">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.nameLabel}</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1 text-left">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">{t.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                  />
                </div>
              </div>

              <div className="space-y-1 text-left">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.passwordLabel}</label>
                  {authMode === 'login' && (
                    <button 
                      type="button"
                      onClick={handleResetPassword}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-tight"
                    >
                      {t.forgotPassword}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-12 pr-4 py-3.5 rounded-2xl border outline-none transition-all font-medium ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-200 focus:border-blue-500'}`}
                  />
                </div>
              </div>

              {authError && (
                <div className="flex items-center gap-2 text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button 
                type="submit"
                disabled={isAuthSubmitLoading}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98]"
              >
                {isAuthSubmitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (authMode === 'login' ? <LogOut className="w-5 h-5 rotate-180" /> : <User className="w-5 h-5" />)}
                {authMode === 'login' ? t.loginEmail : t.register}
              </button>
              <button 
                type="button"
                onClick={handleShareApp}
                className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:shadow-lg'}`}
              >
                <Share2 className="w-5 h-5 text-emerald-500" />
                {t.shareApp}
              </button>
            </form>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {authMode === 'login' ? t.dontHaveAccount : t.alreadyHaveAccount}
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">{t.orConnectWith}</span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
              </div>

              <button
                onClick={async () => {
                  try {
                    await loginWithGoogle();
                  } catch (err: any) {
                    if (err?.code === 'auth/unauthorized-domain') {
                      activateMock();
                      setAuthError(lang === 'pt'
                        ? 'Login com Google indisponível neste domínio. Use e-mail e senha.'
                        : 'Google login unavailable on this domain. Use email and password.');
                    } else {
                      setAuthError(t.loginError);
                    }
                  }
                }}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] border ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                {t.loginWithGoogle}
              </button>
            </div>
         </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans transition-all duration-500 selection:bg-blue-500/30 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-0 h-full z-40 transition-all duration-500 border-r lg:translate-x-0 ${
          isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'
        } ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-2xl shadow-black/50' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/20'}`}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center gap-3 mb-10 px-2 pt-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            {isSidebarOpen && (
              <span className="font-display font-black text-lg tracking-tight truncate">DOCS<span className="text-blue-600">PRO</span></span>
            )}
          </div>

          <nav className="flex-1 space-y-2">
            <button 
              onClick={() => { setActiveTab('scope'); setSelectedFileIds([]); }}
              title={!isSidebarOpen ? t.sidebar.scope : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'scope'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              <FileSearch className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.scope}</span>}
            </button>

            <button 
              onClick={() => { setActiveTab('dashboard'); setSelectedFileIds([]); }}
              title={!isSidebarOpen ? t.sidebar.dashboard : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.dashboard}</span>}
            </button>

            <button 
              onClick={() => { setActiveTab('queue'); setSelectedFileIds([]); }}
              title={!isSidebarOpen ? t.sidebar.queue : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'queue'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              <FileText className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.queue}</span>}
              {isSidebarOpen && activeTab !== 'queue' && files.filter(f => !f.trash).length > 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600'}`}>
                  {files.filter(f => !f.trash).length}
                </span>
              )}
            </button>

            <button 
              onClick={() => { setActiveTab('reports'); setSelectedFileIds([]); }}
              title={!isSidebarOpen ? t.sidebar.reports : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'reports'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              <BarChart3 className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.reports}</span>}
            </button>

            <button 
              onClick={() => { setActiveTab('trash'); setSelectedFileIds([]); }}
              title={!isSidebarOpen ? t.sidebar.trash : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                activeTab === 'trash'
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                  : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
              }`}
            >
              <Trash2 className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.trash}</span>}
              {isSidebarOpen && files.filter(f => f.trash).length > 0 && (
                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'trash' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-600'}`}>
                  {files.filter(f => f.trash).length}
                </span>
              )}
            </button>

            {isAdmin && (
               <button 
                onClick={() => { setActiveTab('admin'); fetchUsers(); setSelectedFileIds([]); }}
                title={!isSidebarOpen ? t.adminDashboard : undefined}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === 'admin'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                    : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100')
                }`}
              >
                <ShieldCheck className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span>{t.adminDashboard}</span>}
              </button>
            )}

            <button 
              onClick={() => setShowSettings(true)}
              title={!isSidebarOpen ? t.sidebar.settings : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SettingsIcon className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{t.sidebar.settings}</span>}
            </button>

            <button 
              onClick={handleShareApp}
              title={!isSidebarOpen ? t.shareApp : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Share2 className="w-5 h-5 shrink-0 text-emerald-500" />
              {isSidebarOpen && <span>{t.shareApp}</span>}
            </button>
          </nav>

          <div className="space-y-4 pt-4 border-t dark:border-slate-800 border-slate-100">
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={!isSidebarOpen ? (theme === 'dark' ? (lang === 'pt' ? 'Modo Claro' : 'Light Mode') : (lang === 'pt' ? 'Modo Escuro' : 'Dark Mode')) : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              {isSidebarOpen && <span>{theme === 'dark' ? (lang === 'pt' ? 'Modo Claro' : 'Light Mode') : (lang === 'pt' ? 'Modo Escuro' : 'Dark Mode')}</span>}
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title={!isSidebarOpen ? (lang === 'pt' ? 'Expandir Menu' : 'Expand Menu') : undefined}
              className={`w-full hidden lg:flex items-center gap-3 px-3 py-3 rounded-2xl transition-all font-bold text-sm ${
                theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Menu className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span>{lang === 'pt' ? 'Recolher Menu' : 'Collapse Menu'}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Merge Review Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-3xl shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white'}`}
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.mergeReviewTitle}</h3>
                <p className="text-sm text-slate-500">{t.mergeReviewDesc}</p>
              </div>
              <button onClick={() => setShowMergeModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {getDuplicateGroups().map((group, idx) => {
                const isSelected = selectedMergeGroups.includes(group.id);
                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      setSelectedMergeGroups(prev => 
                        prev.includes(group.id) 
                          ? prev.filter(id => id !== group.id) 
                          : [...prev, group.id]
                      );
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    theme === 'dark' 
                      ? isSelected ? 'bg-amber-500/10 border-amber-500/50' : 'bg-slate-950/50 border-slate-800 opacity-60 grayscale-[0.5]' 
                      : isSelected ? 'bg-amber-50 shadow-md border-amber-200' : 'bg-slate-50/50 border-slate-100 opacity-60 grayscale-[0.5]'
                  }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${isSelected ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'}`}>
                          {extractionFields.find(f => f.isNFe)?.name || 'ID'}
                        </span>
                        <span className={`font-mono text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>{group.id}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'bg-amber-500 border-amber-500' 
                          : 'border-slate-300 dark:border-slate-700 bg-transparent'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.files.map((file, fIdx) => (
                        <div key={fIdx} className={`flex items-center gap-3 p-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[11px] font-medium truncate ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{file.file.name}</p>
                            <p className="text-[9px] text-slate-400">{(file.file.size / 1024).toFixed(1)} KB</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setPreviewFileId(file.id); }}
                            className={`p-2 rounded-lg transition-all ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-600'}`}
                            title={t.viewDoc}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
              <button 
                onClick={() => setShowMergeModal(false)}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {t.cancelAction}
              </button>
              <button 
                onClick={handleMergeDuplicates}
                className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-2.5 rounded-xl text-sm font-black shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                {t.confirmMerge}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <header 
        className={`fixed top-0 right-0 z-30 transition-all duration-500 border-b backdrop-blur-xl flex items-center justify-between px-6 py-4 left-0 lg:left-0 ${
          isSidebarOpen ? 'lg:left-64' : 'lg:left-20'
        } ${theme === 'dark' ? 'bg-slate-950/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}
      >
        <div className="flex items-center gap-4">
          <div className="lg:hidden">
             <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-slate-900'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
          <div className="flex flex-col">
            <h2 className="font-display font-black text-sm uppercase tracking-[0.2em] text-blue-600 leading-none">
              {activeTab === 'trash' ? t.sidebar.trash : activeTab === 'dashboard' ? t.sidebar.dashboard : activeTab === 'reports' ? t.sidebar.reports : activeTab === 'scope' ? t.sidebar.scope : activeTab === 'admin' ? t.adminDashboard : t.title}
            </h2>
            {userProfile?.name && (
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold uppercase tracking-widest leading-none ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.welcome} {userProfile.name.split(' ')[0]}
                </span>
                <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                  isSuperUser 
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20' 
                    : isAdmin 
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' 
                      : (theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                }`}>
                  {isSuperUser ? t.roleSuper : isAdmin ? t.roleAdmin : t.roleUser}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden min-[450px]:flex items-center gap-1 md:gap-2">
            {files.filter(f => !f.trash).length > 0 && !isProcessingAll && (
              <button 
                onClick={handleClearQueue}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-red-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-red-500 hover:bg-red-50 shadow-red-500/5'}`}
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t.clearAll}</span>
              </button>
            )}

            {files.filter(f => !f.trash && (f.status === 'pending' || f.status === 'error')).length > 0 && !isProcessingAll && (
              <button 
                onClick={processAll}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                <Zap className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{t.processAll}</span>
              </button>
            )}

            {getDuplicateGroups().length > 0 && !isProcessingAll && (
              <button 
                onClick={() => {
                  setSelectedMergeGroups(getDuplicateGroups().map(g => g.id));
                  setShowMergeModal(true);
                }}
                disabled={isMerging}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg ${theme === 'dark' ? 'bg-slate-800 border-amber-900/50 text-amber-500 hover:bg-slate-700' : 'bg-amber-50 border-amber-100 text-amber-600 hover:bg-amber-100 shadow-amber-500/5'}`}
              >
                {isMerging ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <FileSearch className="w-3 h-3 md:w-4 md:h-4" />}
                <span className="hidden sm:inline">{isMerging ? t.merging : t.mergeAction}</span>
                <span className="ml-1 bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{getDuplicateGroups().reduce((acc, g) => acc + (g.files.length - 1), 0)}</span>
              </button>
            )}

            {files.filter(f => !f.trash && f.status === 'success').length > 0 && !isProcessingAll && (
              <button 
                onClick={downloadAllAsZip}
                disabled={isZipping}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-4 py-2 rounded-full text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
              >
                {isZipping ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <Download className="w-3 h-3 md:w-4 md:h-4" />}
                <span className="hidden sm:inline">{t.downloadZip}</span>
              </button>
            )}
            
            {isProcessingAll && (
              <button 
                onClick={cancelProcessing}
                disabled={shouldCancel}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-full text-xs font-bold transition-all border shadow-lg ${shouldCancel ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100 shadow-red-500/10'}`}
              >
                {shouldCancel ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <X className="w-3 h-3 md:w-4 md:h-4" />}
                <span>{shouldCancel ? t.cancelling : t.cancel}</span>
              </button>
            )}

            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingAll}
              className={`p-2 rounded-xl transition-all border disabled:opacity-50 ${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-white border-slate-200 hover:bg-white text-slate-700 hover:shadow-lg'}`}
            >
              <Upload className="w-5 h-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              multiple 
              accept="application/pdf,image/*" 
              className="hidden" 
            />
          </div>

          <div className={`hidden min-[500px]:block w-px h-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              title={lang === 'pt' ? 'Switch to English' : 'Mudar para Português'}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all ${theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-400' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}
            >
              {lang === 'pt' ? 'BR' : 'EN'}
            </button>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={logout}
                title={t.logout}
                className={`p-2.5 rounded-xl transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-red-400' : 'hover:bg-slate-100 text-red-500'}`}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`transition-all duration-500 pt-24 ${isSidebarOpen ? 'lg:pl-64' : 'lg:pl-20'} pl-0 min-h-screen relative`}
      >
        <AnimatePresence>
          {dragActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-10 pointer-events-none"
            >
              <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm border-[6px] border-blue-500 border-dashed m-4 rounded-[3rem]" />
              <div className={`relative px-12 py-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 ${theme === 'dark' ? 'bg-slate-900 border border-slate-800' : 'bg-white shadow-blue-500/10'}`}>
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30">
                  <Upload className="w-10 h-10 text-white animate-bounce" />
                </div>
                <div className="text-center">
                  <h3 className={`text-2xl font-black font-display uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    {lang === 'pt' ? 'Solte para Processar' : 'Drop to Process'}
                  </h3>
                  <p className="text-sm font-bold text-blue-500 uppercase tracking-widest">{t.dragDesc}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-6xl mx-auto px-6 md:px-10 pb-32">
        {activeTab === 'scope' ? (
          <ScopeView t={t} theme={theme} userName={userProfile?.name} onShareApp={handleShareApp} />
        ) : activeTab === 'dashboard' ? (
          <DashboardView files={files} t={t} theme={theme} userName={userProfile?.name} />
        ) : activeTab === 'reports' ? (
          <ReportsView 
            files={files} 
            t={t} 
            theme={theme} 
            onDownload={downloadFile} 
            onDownloadAllZip={downloadAllAsZip}
            onGenerateReport={generateReport}
            generateFileName={generateFileName} 
            isZipping={isZipping}
            selectedFileIds={selectedFileIds}
            setSelectedFileIds={setSelectedFileIds}
            userName={userProfile?.name}
          />
        ) : activeTab === 'admin' ? (
          <AdminView 
             t={t} 
             theme={theme} 
             users={allUsers} 
             allPlanSettings={planSettings}
             onSearchUsers={(val) => setSearchQuery(val)}
             userSearch={searchQuery}
             onUpdateUserPlan={handleUpdateUserPlan}
             onUpdatePlanPrice={handleUpdatePlanPrice}
             isLoading={isAdminLoading}
          />
        ) : (files.filter(f => activeTab === 'trash' ? f.trash : !f.trash).length === 0 && (activeTab === 'queue' || activeTab === 'trash')) ? (
          <motion.div 
            key="empty-state"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`group flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] p-8 md:p-24 transition-all duration-500 shadow-2xl ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 shadow-black/20 hover:border-blue-500/50' : 'bg-white border-slate-200 shadow-slate-200/50 hover:border-blue-400'}`}
          >
            <div className={`p-6 md:p-8 rounded-[2rem] mb-6 md:mb-8 group-hover:scale-110 transition-transform duration-500 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
              {activeTab === 'trash' ? (
                <Trash2 className="w-12 h-12 md:w-16 md:h-16 text-slate-400" />
              ) : (
                <Upload className="w-12 h-12 md:w-16 md:h-16 text-blue-500" />
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-display mb-3 tracking-tight text-center">
              {activeTab === 'trash' ? (lang === 'pt' ? 'Lixeira Vazia' : 'Trash is Empty') : t.dragTitle}
            </h2>
            <p className={`mb-8 md:mb-10 max-w-sm text-center text-sm md:text-base font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {activeTab === 'trash' ? (lang === 'pt' ? 'Os arquivos que você excluir aparecerão aqui.' : 'Files you delete will appear here.') : t.dragDesc}
            </p>
            {activeTab !== 'trash' && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-10 py-3.5 rounded-full font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 active:scale-95"
              >
                {t.chooseFiles}
              </button>
            )}
          </motion.div>
        ) : (activeTab === 'queue' || activeTab === 'trash') ? (
          <div key="list-view" className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
              <div className="space-y-4 w-full max-w-2xl">
                <div>
                  {userProfile?.name && (
                    <p className="text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
                      {t.welcome} {userProfile.name}
                    </p>
                  )}
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold font-display tracking-tight">
                      {activeTab === 'trash' ? t.sidebar.trash : t.sidebar.queue}
                    </h3>
                    <div className="flex items-center gap-2">
                       <span className="text-sm text-blue-500 font-bold uppercase tracking-wider">
                        {files.filter(f => activeTab === 'trash' ? f.trash : !f.trash).length} {files.filter(f => activeTab === 'trash' ? f.trash : !f.trash).length === 1 ? t.fileLoaded : t.filesLoaded}
                      </span>
                    </div>
                  </div>

                  {/* Status Filters */}
                  {activeTab === 'queue' && (
                    <div className="flex flex-wrap items-center gap-2 mt-4 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl w-fit">
                      <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          statusFilter === 'all' 
                            ? (theme === 'dark' ? 'bg-slate-700 text-blue-400 shadow-lg' : 'bg-white text-blue-600 shadow-sm')
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        {t.reports.all} ({files.filter(f => !f.trash).length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('pending')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          statusFilter === 'pending' 
                            ? (theme === 'dark' ? 'bg-slate-700 text-amber-400 shadow-lg' : 'bg-white text-amber-600 shadow-sm')
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {t.pendingBadge} ({files.filter(f => !f.trash && f.status === 'pending').length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('error')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          statusFilter === 'error' 
                            ? (theme === 'dark' ? 'bg-slate-700 text-red-400 shadow-lg' : 'bg-white text-red-600 shadow-sm')
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        {t.failures} ({files.filter(f => !f.trash && f.status === 'error').length})
                      </button>
                      <button
                        onClick={() => setStatusFilter('success')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          statusFilter === 'success' 
                            ? (theme === 'dark' ? 'bg-slate-700 text-emerald-400 shadow-lg' : 'bg-white text-emerald-600 shadow-sm')
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t.success} ({files.filter(f => !f.trash && f.status === 'success').length})
                      </button>

                      <button
                        onClick={handleClearQueue}
                        title={t.clearAll}
                        className={`ml-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-800 text-red-400 hover:bg-slate-700' : 'bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t.clearAll}
                      </button>
                    </div>
                  )}
                  {userProfile?.plan !== 'enterprise' && activeTab !== 'trash' && (
                    <p className="text-[10px] font-bold text-slate-500 mt-1">
                      {t.usageLabel} {userProfile?.usageCount || 0}/{userProfile?.geminiApiKey ? '∞' : (PLAN_LIMITS[userProfile?.plan as keyof typeof PLAN_LIMITS] || 10)}
                    </p>
                  )}
                </div>
                
                {activeTab !== 'trash' && (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Pattern Config */}
                    <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        {t.patternLabel}
                      </label>
                      <div className="flex items-center gap-2">
                        <Edit3 className="w-4 h-4 text-blue-500" />
                        <input 
                          type="text" 
                          value={fileNamePattern}
                          onChange={(e) => setFileNamePattern(e.target.value)}
                          className={`w-full bg-transparent border-none focus:ring-0 font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                          placeholder={t.patternPlaceholder}
                        />
                      </div>
                      <p className="mt-2 text-[9px] text-slate-500 font-medium">
                        {t.patternHelp}
                      </p>
                    </div>

                    {/* Extraction Fields Config */}
                    <div className={`border rounded-2xl p-4 shadow-sm transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                        {t.fieldsConfig}
                      </label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {extractionFields.map(field => (
                          <div key={field.id} className={`flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${theme === 'dark' ? (field.useForMerge ? 'bg-blue-900/30 border-blue-500/50 text-blue-400' : 'bg-slate-800 border-slate-700 text-slate-300') : (field.useForMerge ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-600')}`}>
                            <button 
                              onClick={() => setExtractionFields(prev => prev.map(f => f.id === field.id ? { ...f, useForMerge: !f.useForMerge } : f))}
                              title={t.mergeFieldLabel}
                              className={`transition-colors ${field.useForMerge ? 'text-blue-500' : 'text-slate-400 opacity-50 hover:opacity-100'}`}
                            >
                              <Zap className={`w-3 h-3 ${field.useForMerge ? 'fill-current' : ''}`} />
                            </button>
                            {field.name}
                            {!field.isNFe && (
                              <button 
                                onClick={() => setExtractionFields(prev => prev.filter(f => f.id !== field.id))}
                                className="ml-1 hover:text-red-500 transition-colors opacity-50 hover:opacity-100"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder={t.fieldExample}
                          className={`flex-1 bg-transparent border-b border-slate-200 focus:border-blue-500 transition-colors py-1 text-xs font-bold focus:ring-0 placeholder:text-slate-300 ${theme === 'dark' ? 'text-slate-300 border-slate-800' : 'text-slate-700'}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const val = (e.target as HTMLInputElement).value.trim();
                              if (val) {
                                setExtractionFields(prev => [...prev, { id: val.toLowerCase().replace(/\s+/g, '-'), name: val, useForMerge: false }]);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <button 
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            const val = input.value.trim();
                            if (val) {
                              setExtractionFields(prev => [...prev, { id: val.toLowerCase().replace(/\s+/g, '-'), name: val, useForMerge: false }]);
                              input.value = '';
                            }
                          }}
                          className="p-1 px-3 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all"
                        >
                          {t.addField}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Bulk Actions Bar */}
              <AnimatePresence>
                {visibleFiles.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-full max-w-[calc(100vw-2rem)] flex justify-center px-4"
                  >
                    <div className={`pointer-events-auto flex items-center gap-2 p-1.5 rounded-2xl border shadow-2xl backdrop-blur-xl max-w-full overflow-hidden ${theme === 'dark' ? 'bg-slate-900/90 border-slate-700 shadow-black/40' : 'bg-white/90 border-slate-200 shadow-slate-300/50'}`}>
                      <button 
                        onClick={handleSelectAll}
                        className={`h-10 shrink-0 flex items-center gap-2 px-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest ${selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0 ? 'bg-blue-600 text-white' : (theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0 ? 'bg-blue-600 border-blue-600' : (theme === 'dark' ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white')}`}>
                          {selectedFileIds.length === visibleFiles.length && visibleFiles.length > 0 && <Check className="w-3 h-3 text-white" />}
                          {selectedFileIds.length > 0 && selectedFileIds.length < visibleFiles.length && <div className="w-2 h-0.5 bg-blue-600 dark:bg-blue-400" />}
                        </div>
                        <span className="hidden sm:inline">{t.selectAll}</span>
                      </button>

                      {selectedFileIds.length > 0 && (
                        <motion.div 
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-2 ml-1 overflow-x-auto scrollbar-none py-0.5"
                        >
                          <div className={`h-10 px-2 rounded-xl shrink-0 flex flex-col items-center justify-center leading-none ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-600'} border ${theme === 'dark' ? 'border-blue-500/20' : 'border-blue-100'}`}>
                            <span className="text-xs font-black">{selectedFileIds.length}</span>
                            <span className="text-[6px] font-black uppercase tracking-tighter text-center leading-[6px]">{t.selected}</span>
                          </div>

                          {activeTab === 'trash' ? (
                            <button 
                              onClick={() => handleRestore(selectedFileIds)}
                              className="h-10 flex items-center gap-2 px-4 rounded-xl bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
                              title={t.restore}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{t.restore}</span>
                            </button>
                          ) : (
                            <>
                              <button 
                                onClick={handleProcessSelected}
                                className="h-10 shrink-0 flex items-center gap-2 px-3 sm:px-4 rounded-xl bg-blue-600 text-white font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 whitespace-nowrap"
                                title={t.processAll}
                              >
                                <Zap className="w-4 h-4" />
                                <span className="hidden sm:inline uppercase">{t.processAll}</span>
                              </button>
                              
                              <button 
                                onClick={handleShareBatchWhatsApp}
                                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                                title="WhatsApp"
                              >
                                <MessageCircle className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={handleShareBatchEmail}
                                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-blue-500 text-white hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                                title="E-mail"
                              >
                                <Mail className="w-5 h-5" />
                              </button>

                              <button 
                                onClick={handleDownloadSelected}
                                className={`w-10 h-10 shrink-0 flex items-center justify-center rounded-xl border transition-all shadow-sm ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-blue-400 hover:text-blue-300' : 'bg-white border-slate-200 text-blue-600 hover:bg-blue-50'}`}
                                title="Download ZIP"
                              >
                                <Download className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          
                          <button 
                            onClick={handleRemoveSelected}
                            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                            title={activeTab === 'trash' ? t.permanentlyDelete : t.deleteSelected}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </motion.div>
                      )}

                      {activeTab === 'trash' && selectedFileIds.length === 0 && (
                        <button 
                          onClick={() => setConfirmDelete({ show: true, type: 'permanent', ids: files.filter(f => f.trash).map(f => f.id) })}
                          disabled={visibleFiles.length === 0}
                          className={`h-10 shrink-0 flex items-center gap-2 px-4 rounded-xl border font-bold text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-red-400/50 hover:text-red-400' : 'bg-white border-slate-200 text-red-500 hover:bg-red-50'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">{t.emptyTrash}</span>
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="grid gap-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {visibleFiles.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`py-20 text-center border-2 border-dashed rounded-[2rem] ${theme === 'dark' ? 'bg-slate-900/50 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
                  >
                    <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="font-bold text-sm uppercase tracking-widest">
                      {lang === 'pt' ? 'Nenhum arquivo encontrado com este filtro.' : 'No files found matching this filter.'}
                    </p>
                  </motion.div>
                ) : (
                  visibleFiles.map((file) => (
                    <FileCard 
                      key={file.id} 
                      item={file} 
                      onRemove={removeFile}
                      onRestore={() => handleRestore([file.id])}
                      onProcess={processFile}
                      onUpdateField={updateFieldValue}
                      onDownload={downloadFile}
                      extractionFields={extractionFields}
                      generateFileName={generateFileName}
                      onPreview={() => setPreviewFileId(file.id)}
                      onShareEmail={() => handleShareIndividualEmail(file)}
                      onShareWhatsApp={() => handleShareIndividualWhatsApp(file)}
                      isSelected={selectedFileIds.includes(file.id)}
                      onToggleSelect={() => handleToggleSelect(file.id)}
                      t={t}
                      theme={theme}
                    />
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        ) : null}
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
            >
              <div className={`px-6 py-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-50'}`}>
                    <SettingsIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.settings}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.profile}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSettings(false)}
                  className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh] scrollbar-thin scrollbar-thumb-blue-600/20 scrollbar-track-transparent">
                {/* Identification Section */}
                <div className="space-y-4">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.identification}</label>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-4">{t.userName}</label>
                      <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <User className="w-5 h-5 text-blue-500" />
                        <input 
                          type="text" 
                          value={tempDisplayName}
                          onChange={(e) => setTempDisplayName(e.target.value)}
                          className={`w-full bg-transparent border-none focus:ring-0 text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-4">{t.userEmail}</label>
                      <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl opacity-60 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                        <Mail className="w-5 h-5 text-slate-400" />
                        <input 
                          type="text" 
                          value={user.email}
                          disabled
                          className={`w-full bg-transparent border-none focus:ring-0 text-sm font-mono font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}
                        />
                      </div>
                    </div>

                    {/* Password Change Section right here */}
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase ml-4">{t.changePasswordTitle}</label>
                        <button 
                          onClick={() => setShowPasswordChange(!showPasswordChange)}
                          className={`text-[9px] font-extrabold px-3 py-1 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {showPasswordChange ? t.cancel : lang === 'pt' ? 'Alterar Senha' : 'Change Password'}
                        </button>
                      </div>
                      
                      {showPasswordChange && (
                        <div className="space-y-3 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-2">{t.newPasswordLabel}</label>
                            <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                              <Key className="w-4 h-4 text-blue-500" />
                              <input 
                                type={showNewPassword ? "text" : "password"} 
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="******"
                                className={`w-full bg-transparent border-none focus:ring-0 text-xs font-mono font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                              />
                              <button 
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[8px] font-black text-slate-400 uppercase mb-1 ml-2">{t.confirmNewPasswordLabel}</label>
                            <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                              <Key className="w-4 h-4 text-blue-500" />
                              <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="******"
                                className={`w-full bg-transparent border-none focus:ring-0 text-xs font-mono font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                              />
                              <button 
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <button 
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                          >
                            {isUpdatingPassword ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t.changePasswordBtn}
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1 ml-4">{t.accessLevel}</label>
                      <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                        <Crown className={`w-5 h-5 ${isSuperUser ? 'text-amber-500' : isAdmin ? 'text-blue-500' : 'text-slate-400'}`} />
                        <span className={`text-sm font-bold ${isSuperUser ? 'text-amber-500' : isAdmin ? 'text-blue-500' : 'text-slate-500'}`}>
                          {isSuperUser ? t.roleSuper : isAdmin ? t.roleAdmin : t.roleUser}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`w-full h-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.geminiKeyLabel}</label>
                  <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <Key className="w-5 h-5 text-blue-500" />
                    <input 
                      type="password" 
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder={t.geminiKeyPlaceholder}
                      className={`w-full bg-transparent border-none focus:ring-0 text-sm font-mono font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    />
                  </div>
                  <div className={`mt-3 p-4 rounded-xl border flex flex-col gap-2 ${theme === 'dark' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                    <p className={`text-[11px] leading-relaxed font-medium ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                      {t.geminiKeyHelp}
                    </p>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noreferrer"
                      className={`text-[11px] font-black inline-flex items-center gap-1.5 transition-all hover:underline uppercase tracking-tight ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      {t.getGeminiKey}
                    </a>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 leading-relaxed italic">
                    {lang === 'pt' ? '* Sua chave é salva de forma segura e usada apenas para suas extrações.' : '* Your key is saved securely and used only for your extractions.'}
                  </p>
                </div>

                <div className={`w-full h-px ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`} />

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.nfeDigitsLabel}</label>
                  <div className={`flex items-center gap-3 px-4 py-3 border rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <FileText className="w-5 h-5 text-blue-500" />
                    <input 
                      type="number" 
                      min="1"
                      max="20"
                      value={tempNfeDigits}
                      onChange={(e) => setTempNfeDigits(parseInt(e.target.value) || 0)}
                      placeholder={t.nfeDigitsPlaceholder}
                      className={`w-full bg-transparent border-none focus:ring-0 text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 leading-relaxed italic">
                    {t.nfeDigitsHelp}
                  </p>
                </div>

                <div className={`p-4 rounded-2xl flex items-center gap-3 transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                    {(tempDisplayName || user.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{tempDisplayName || user.displayName}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${userProfile?.plan === 'free' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                          {userProfile?.usageCount || 0} {t.usage}
                        </span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${userProfile?.plan === 'free' ? 'bg-slate-200 text-slate-600' : 'bg-amber-100 text-amber-700'}`}>
                          {userProfile?.plan}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">{t.plansTitle}</label>
                   
                   {/* Free Plan Card */}
                   <div className={`p-4 rounded-2xl border transition-all ${userProfile?.plan === 'free' ? 'border-blue-400 bg-blue-50/10' : (theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50')}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-500" />
                          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>Free</span>
                          <span className="text-[10px] font-bold text-slate-400 ml-1">{planSettings.free.price}</span>
                        </div>
                        {userProfile?.plan !== 'free' && (
                          <button 
                            onClick={async () => {
                              await updatePlan(user.uid, 'free');
                              setUserProfile(await getUserProfile(user.uid));
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-bold"
                          >
                            SELECT
                          </button>
                        )}
                        {userProfile?.plan === 'free' && (
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{t.trialLimit}</p>
                   </div>

                   {/* Basico Plan Card */}
                   <div className={`p-4 rounded-2xl border transition-all ${userProfile?.plan === 'basico' ? 'border-emerald-400 bg-emerald-50/10' : (theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50')}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-emerald-500" />
                          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.basicoPlan}</span>
                          <span className="text-[10px] font-bold text-emerald-600/80 ml-1">{planSettings.basico?.price || t.basicoPrice}</span>
                        </div>
                        {userProfile?.plan !== 'basico' && (
                          <button 
                            onClick={async () => {
                              await updatePlan(user.uid, 'basico');
                              setUserProfile(await getUserProfile(user.uid));
                            }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg shadow-emerald-500/20"
                          >
                            SELECT
                          </button>
                        )}
                        {userProfile?.plan === 'basico' && (
                          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{t.basicoDesc}</p>
                   </div>

                   {/* Pro Plan Card */}
                   <div className={`p-4 rounded-2xl border transition-all ${userProfile?.plan === 'pro' ? 'border-amber-400 bg-amber-50/10' : (theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50')}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.proPlan}</span>
                          <span className="text-[10px] font-bold text-amber-600/80 ml-1">{planSettings.pro.price}</span>
                        </div>
                        {userProfile?.plan !== 'pro' && (
                          <button 
                            onClick={async () => {
                              await updatePlan(user.uid, 'pro');
                              setUserProfile(await getUserProfile(user.uid));
                            }}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg shadow-amber-500/20"
                          >
                            SELECT
                          </button>
                        )}
                        {userProfile?.plan === 'pro' && (
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{t.proDesc}</p>
                   </div>

                   {/* Enterprise Plan Card */}
                   <div className={`p-4 rounded-2xl border transition-all ${userProfile?.plan === 'enterprise' ? 'border-blue-400 bg-blue-50/10' : (theme === 'dark' ? 'border-slate-800 bg-slate-950/50' : 'border-slate-100 bg-slate-50/50')}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-500" />
                          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{t.enterprisePlan}</span>
                          <span className="text-[10px] font-bold text-blue-600/80 ml-1">{planSettings.enterprise.price}</span>
                        </div>
                        {userProfile?.plan !== 'enterprise' && (
                          <button 
                            onClick={async () => {
                              await updatePlan(user.uid, 'enterprise');
                              setUserProfile(await getUserProfile(user.uid));
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-[10px] font-bold shadow-lg shadow-blue-500/20"
                          >
                            SELECT
                          </button>
                        )}
                        {userProfile?.plan === 'enterprise' && (
                          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Active</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{t.enterpriseDesc}</p>
                   </div>
                </div>

                <button 
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t.saveSettings}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100]"
          >
            <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md border ${
              toast.type === 'success' 
                ? (theme === 'dark' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                : toast.type === 'error'
                ? (theme === 'dark' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-red-50 border-red-200 text-red-700')
                : (theme === 'dark' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700')
            }`}>
              {toast.type === 'success' && <div className="p-1 bg-emerald-500 rounded-lg"><ShieldCheck className="w-4 h-4 text-white" /></div>}
              {toast.type === 'error' && <div className="p-1 bg-red-500 rounded-lg"><Loader2 className="w-4 h-4 text-white" /></div>}
              {toast.type === 'info' && <div className="p-1 bg-blue-500 rounded-lg"><Zap className="w-4 h-4 text-white" /></div>}
              <span className="font-black text-sm uppercase tracking-wider">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-10">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setPreviewFileId(null); setEditingPreviewFieldId(null); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-6xl h-full rounded-[2rem] shadow-2xl flex flex-col overflow-hidden transition-colors ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
            >
              <div className={`px-6 py-4 flex items-center justify-between border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-50'}`}>
                    <Eye className={`w-5 h-5 ${theme === 'dark' ? 'text-white' : 'text-blue-600'}`} />
                  </div>
                  <div>
                    <h4 className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{previewFile.file.name}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.viewDoc}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setPreviewFileId(null); setEditingPreviewFieldId(null); }}
                  className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className={`flex-1 relative ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                <iframe 
                  src={previewFile.previewUrl} 
                  className="w-full h-full border-none"
                  title="PDF Preview"
                />
              </div>
              <div className={`px-8 py-6 border-t flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'}`}>
                <div className="flex flex-wrap gap-6">
                  {extractionFields.map(field => {
                    const isEditing = editingPreviewFieldId === field.id;
                    const value = previewFile.fieldValues[field.id];

                    return (
                      <div key={field.id} className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">{field.name}</span>
                        {isEditing ? (
                          <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 shadow-inner transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                            <input 
                              type="text" 
                              value={editPreviewValue}
                              onChange={(e) => setEditPreviewValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  updateFieldValue(previewFile.id, field.id, editPreviewValue);
                                  setEditingPreviewFieldId(null);
                                } else if (e.key === 'Escape') {
                                  setEditingPreviewFieldId(null);
                                }
                              }}
                              className="bg-transparent border-none focus:ring-0 text-lg font-mono font-black w-40 text-blue-500"
                              placeholder={`${field.name}...`}
                            />
                            <button 
                              onClick={() => {
                                updateFieldValue(previewFile.id, field.id, editPreviewValue);
                                setEditingPreviewFieldId(null);
                              }} 
                              className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button onClick={() => setEditingPreviewFieldId(null)} className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group/preview-val">
                            <span className={`text-lg font-mono font-black tracking-tight ${value ? (theme === 'dark' ? 'text-blue-400' : 'text-slate-900') : 'text-slate-400 italic'}`}>
                              {value || t.notIdentified}
                            </span>
                            <button 
                              onClick={() => {
                                setEditPreviewValue(value || '');
                                setEditingPreviewFieldId(field.id);
                              }}
                              className={`p-1.5 rounded-lg transition-all opacity-0 group-hover/preview-val:opacity-100 ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-500 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-600'}`}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase text-blue-500 tracking-tighter">{t.finalName}</span>
                    <span className={`text-xs font-medium italic opacity-70 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {generateFileName(previewFile)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 self-end">
                  <button 
                     onClick={() => { setPreviewFileId(null); setEditingPreviewFieldId(null); }}
                     className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20"
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete({ show: false, type: 'trash', ids: [] })}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`relative w-full max-w-md rounded-3xl p-8 shadow-2xl transition-colors ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
            >
              <div className="text-center space-y-4">
                <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${confirmDelete.type === 'trash' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
                  <AlertCircle className="w-8 h-8" />
                </div>
                
                <h3 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {t.confirmDeleteTitle}
                </h3>
                
                <p className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {confirmDelete.type === 'trash' && t.confirmDeleteMsg}
                  {confirmDelete.type === 'empty' && t.confirmEmptyTrashMsg}
                  {confirmDelete.type === 'permanent' && t.confirmPermanentDeleteMsg}
                </p>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setConfirmDelete({ show: false, type: 'trash', ids: [] })}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {t.cancel}
                  </button>
                  <button 
                    onClick={confirmAction}
                    className={`flex-1 px-6 py-3 rounded-xl font-bold text-white transition-all shadow-lg ${confirmDelete.type === 'trash' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-red-500 hover:bg-red-600 shadow-red-500/20'}`}
                  >
                    {confirmDelete.type === 'trash' ? t.deleteSelected : t.permanentlyDelete}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className={`py-20 border-t mt-20 transition-colors ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
            <FileSearch className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-slate-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] opacity-80 text-center flex flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4">
            <span>Powered by TNA Digital</span>
            <span className="opacity-40">&</span>
            <span>Google Gemini AI</span>
          </div>
        </div>
      </footer>

      {/* WhatsApp Support Button */}
      <motion.a
        href="https://wa.me/5518997117096"
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, scale: 0, x: 20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        whileHover={{ scale: 1.1, y: -5 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 p-3 md:p-4 bg-[#25D366] text-white rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] flex items-center justify-center group"
        title={t.support}
      >
        <MessageCircle className="w-6 h-6 md:w-7 md:h-7 fill-white/20" />
        <div className="absolute right-full mr-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all shadow-xl pointer-events-none">
          {t.support}
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 border-8 border-transparent border-l-white dark:border-l-slate-900" />
        </div>
      </motion.a>
    </div>
  );
}

function FileCard({ 
  item, 
  onRemove, 
  onRestore,
  onProcess, 
  onUpdateField,
  onDownload,
  extractionFields,
  generateFileName,
  onPreview,
  onShareEmail,
  onShareWhatsApp,
  isSelected,
  onToggleSelect,
  t,
  theme
}: { 
  item: ProcessedFile, 
  onRemove: (id: string) => void,
  onRestore: () => void,
  onProcess: (id: string) => Promise<void> | void,
  onUpdateField: (fileId: string, fieldId: string, val: string) => void,
  onDownload: (item: ProcessedFile) => void,
  extractionFields: ExtractionField[],
  generateFileName: (item: ProcessedFile) => string,
  onPreview: () => void,
  onShareEmail: () => void,
  onShareWhatsApp: () => void,
  isSelected: boolean,
  onToggleSelect: () => void,
  t: any,
  theme: Theme,
  key?: React.Key
}) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleSave = () => {
    if (editingFieldId) {
      onUpdateField(item.id, editingFieldId, editValue);
      setEditingFieldId(null);
    }
  };

  const handleCancel = () => {
    setEditingFieldId(null);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`relative border rounded-3xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 group transition-all duration-300 hover:shadow-xl ${isSelected ? (theme === 'dark' ? 'bg-blue-900/10 border-blue-500/50 shadow-blue-900/20' : 'bg-blue-50 border-blue-200 shadow-blue-100') : (theme === 'dark' ? 'bg-slate-900 border-slate-800 hover:border-blue-500/30' : 'bg-white border-slate-200 hover:border-blue-100')}`}
    >
      <div className="flex items-center gap-4 w-full md:w-auto">
        <button 
          onClick={onToggleSelect}
          className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : (theme === 'dark' ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-slate-50')}`}
        >
          {isSelected && <Check className="w-4 h-4 text-white" />}
        </button>

        <div className={`p-4 rounded-2xl relative group/icon transition-colors ${isSelected ? (theme === 'dark' ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600') : (theme === 'dark' ? 'bg-slate-800 text-slate-500 hover:bg-blue-600' : 'bg-slate-50 text-slate-400 hover:bg-blue-100')}`}>
          <FileText className="w-7 h-7" />
          <button 
            onClick={onPreview}
            className="absolute inset-0 flex items-center justify-center bg-blue-600 rounded-2xl opacity-0 group-hover/icon:opacity-100 transition-opacity text-white shadow-xl"
            title={t.viewDoc}
          >
            <Eye className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className={`font-bold truncate block max-w-[150px] sm:max-w-xs md:max-w-md text-base tracking-tight transition-colors ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
            {item.file.name}
          </span>
          <StatusBadge status={item.status} step={item.step} error={item.errorMessage} t={t} />
        </div>
        
        <div className="flex flex-wrap gap-3">
          {extractionFields.map(field => {
            const isEditing = editingFieldId === field.id;
            const value = item.fieldValues[field.id];
            
            return (
              <div key={field.id} className="flex flex-col gap-1">
                {isEditing ? (
                  <div className={`flex items-center gap-2 border rounded-xl px-3 py-1.5 shadow-inner transition-colors ${theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <input 
                      type="text" 
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      autoFocus
                      className="bg-transparent border-none focus:ring-0 text-xs font-mono font-bold w-32 text-blue-500"
                      placeholder={`${field.name}...`}
                    />
                    <button onClick={handleSave} className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={handleCancel} className={`p-1 rounded-lg transition-colors ${theme === 'dark' ? 'text-slate-500 hover:bg-slate-800' : 'text-slate-400 hover:bg-slate-100'}`}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 rounded-lg px-2 py-1 group/val transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter shrink-0">{field.name}:</span>
                    <span className={`text-xs font-mono font-bold truncate max-w-[150px] ${value ? (theme === 'dark' ? 'text-blue-400' : 'text-slate-900') : 'text-slate-400 italic'}`}>
                      {value || t.notIdentified}
                    </span>
                    {(item.status === 'success' || item.status === 'error' || item.status === 'pending') && (
                      <button 
                        onClick={() => {
                          setEditValue(value || '');
                          setEditingFieldId(field.id);
                        }}
                        className={`p-1 rounded transition-all opacity-0 group-hover:opacity-100 ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-500 hover:text-white' : 'hover:bg-white text-slate-400 hover:text-blue-600'}`}
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {item.status === 'success' && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 truncate mt-1">
            <span className="text-blue-500 uppercase font-bold text-[9px] shrink-0">{t.finalName}:</span>
            <span className="truncate opacity-70 italic">{generateFileName(item)}</span>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-1 md:gap-1.5 w-full md:w-auto mt-2 md:mt-0 justify-end border-t md:border-t-0 pt-3 md:pt-0 transition-colors ${theme === 'dark' ? 'border-slate-800' : 'border-slate-50'}`}>
        {item.trash ? (
          <button 
            onClick={onRestore}
            className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-600 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
            title={t.restore}
          >
            <CheckCircle2 className="w-5 h-5" />
          </button>
        ) : (
          <>
            {(item.status === 'pending' || item.status === 'error') && (
              <button 
                onClick={() => onProcess(item.id)}
                className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                title={item.status === 'pending' ? t.process : t.retry}
              >
                <Zap className={`w-5 h-5 ${item.status === 'error' ? 'animate-pulse' : ''}`} />
              </button>
            )}
            
            {item.status === 'success' && (
              <>
                <button 
                  onClick={() => onDownload(item)}
                  className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                  title={t.download}
                >
                  <Download className="w-5 h-5" />
                </button>
                <button 
                  onClick={onShareWhatsApp}
                  className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}
                  title={t.shareWhatsApp}
                >
                  <MessageCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={onShareEmail}
                  className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white' : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'}`}
                  title={t.shareEmail}
                >
                  <Mail className="w-5 h-5" />
                </button>
              </>
            )}
          </>
        )}

        <button 
          onClick={() => onRemove(item.id)}
          className={`p-2.5 rounded-xl transition-all ${theme === 'dark' ? 'text-slate-600 hover:text-red-500 hover:bg-red-500/10' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
          title={t.remove}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

function StatusBadge({ status, step, error, t }: { status: ProcessedFile['status'], step?: ProcessedFile['step'], error?: string, t: any }) {
  switch (status) {
    case 'processing':
      const stepLabels: Record<string, string> = {
        preparando: t.stepReading,
        analisando: t.stepAnalyzing,
        finalizando: t.stepFinalizing
      };
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600/10 text-blue-500 text-[10px] font-black uppercase tracking-[0.1em]">
          <Loader2 className="w-3 h-3 animate-spin" />
          {step ? stepLabels[step] : t.stepOcr}
        </span>
      );
    case 'success':
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/10 text-emerald-500 text-[10px] font-black uppercase tracking-[0.1em]">
          <CheckCircle2 className="w-3 h-3" />
          {t.successBadge}
        </span>
      );
    case 'error':
      return (
        <div className="group relative">
           <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/10 text-red-500 text-[10px] font-black uppercase tracking-[0.1em] cursor-help">
            <AlertCircle className="w-3 h-3" />
            {t.failBadge}
          </span>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-slate-900 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg whitespace-nowrap z-20 shadow-xl border border-slate-800">
            {error || t.notIdentified}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
          </div>
        </div>
      );
    default:
      return (
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em]">
          {t.pendingBadge}
        </span>
      );
  }
}

function ScopeView({ t, theme, userName, onShareApp }: { t: any, theme: string, userName?: string, onShareApp: () => void }) {
  const cards = [
    {
      icon: <Zap className="w-8 h-8 text-blue-500" />,
      title: t.scope.ocrTitle,
      desc: t.scope.ocrDesc,
    },
    {
      icon: <FileText className="w-8 h-8 text-emerald-500" />,
      title: t.scope.renamerTitle,
      desc: t.scope.renamerDesc,
    },
    {
      icon: <LayoutDashboard className="w-8 h-8 text-amber-500" />,
      title: t.scope.pdfTitle,
      desc: t.scope.pdfDesc,
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12 py-10"
    >
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        {userName && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px]"
          >
            {t.welcome} {userName}
          </motion.p>
        )}
        <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight leading-tight">
          {t.scope.title}
        </h1>
        <p className={`text-lg font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
          {t.scope.subtitle}
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`p-8 rounded-[2.5rem] border shadow-2xl transition-all hover:scale-[1.02] ${theme === 'dark' ? 'bg-slate-900 border-slate-800 shadow-black/20' : 'bg-white border-slate-200 shadow-slate-200/50'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
              {card.icon}
            </div>
            <h3 className="text-xl font-black font-display mb-3 tracking-tight underline decoration-blue-500 decoration-4 underline-offset-4">
              {card.title}
            </h3>
            <p className={`font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {card.desc}
            </p>
          </motion.div>
        ))}
      </div>

      <div className={`p-10 rounded-[3rem] border flex flex-col md:flex-row items-center gap-10 ${theme === 'dark' ? 'bg-blue-600/10 border-blue-600/20' : 'bg-blue-50 border-blue-100'}`}>
        <div className="shrink-0 w-32 h-32 bg-blue-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-600/30">
          <ShieldCheck className="w-16 h-16 text-white" />
        </div>
        <div className="space-y-3">
          <h4 className="text-2xl font-black font-display tracking-tight">Privacidade e Segurança</h4>
          <p className={`font-medium leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
            Seus documentos são processados localmente e via API segura. Não armazenamos seus arquivos permanentemente a menos que você solicite. Ideal para contabilidades, transportadoras e escritórios que precisam de agilidade e conformidade.
          </p>
        </div>
      </div>

      <div className={`p-8 md:p-12 rounded-[3rem] border flex flex-col md:flex-row items-center justify-between gap-8 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
        <div className="space-y-3 text-center md:text-left">
          <h3 className="text-2xl font-black font-display tracking-tight">{t.shareApp}</h3>
          <p className={`font-medium max-w-md ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.shareAppDesc}
          </p>
        </div>
        <button 
          onClick={onShareApp}
          className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-[2rem] font-bold text-lg transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
        >
          <Share2 className="w-6 h-6" />
          {t.shareApp}
        </button>
      </div>
    </motion.div>
  );
}

function DashboardView({ files, t, theme, userName }: { files: ProcessedFile[], t: any, theme: string, userName?: string }) {
  const stats = {
    total: files.filter(f => !f.trash).length,
    processed: files.filter(f => !f.trash && f.status === 'success').length,
    errors: files.filter(f => !f.trash && f.status === 'error').length,
    pending: files.filter(f => !f.trash && f.status === 'pending').length
  };

  const chartData = [
    { name: t.successBadge, value: stats.processed, color: '#10b981' },
    { name: t.failBadge, value: stats.errors, color: '#ef4444' },
    { name: t.pendingBadge, value: stats.pending, color: '#64748b' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="px-2">
        {userName && (
          <p className="text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
            {t.welcome} {userName}
          </p>
        )}
        <h2 className="text-3xl font-black font-display tracking-tight mb-2">{t.dashboard.title}</h2>
        <p className="text-slate-500 font-medium">{t.dashboard.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: t.dashboard.totalFiles, value: stats.total, icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: t.dashboard.processed, value: stats.processed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: t.dashboard.errors, value: stats.errors, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
          { label: t.dashboard.pending, value: stats.pending, icon: Loader2, color: 'text-slate-500', bg: 'bg-slate-500/10' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-4`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{stat.label}</p>
            <p className={`text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-lg font-black font-display mb-6">{t.dashboard.filesByStatus}</h3>
          <div className="h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm italic">
                {t.dashboard.noData}
              </div>
            )}
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
          <h3 className="text-lg font-black font-display mb-6">{t.dashboard.activityChart}</h3>
          <div className="h-[300px]">
             {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#1e293b' : '#f1f5f9'} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 'bold' }} 
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
             ) : (
              <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm italic">
                {t.dashboard.noData}
              </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsView({ 
  files, 
  t, 
  theme, 
  onDownload, 
  onDownloadAllZip,
  onGenerateReport,
  generateFileName,
  isZipping,
  selectedFileIds,
  setSelectedFileIds,
  userName
}: { 
  files: ProcessedFile[], 
  t: any, 
  theme: string,
  onDownload: (f: ProcessedFile) => void,
  onDownloadAllZip: () => void,
  onGenerateReport: () => void,
  generateFileName: (f: ProcessedFile) => string,
  isZipping: boolean,
  selectedFileIds: string[],
  setSelectedFileIds: React.Dispatch<React.SetStateAction<string[]>>,
  userName?: string
}) {
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'pending'>('all');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredFiles = files.filter(f => !f.trash).filter(f => {
    const matchesFilter = filter === 'all' || f.status === filter;
    const matchesSearch = f.file.name.toLowerCase().includes(search.toLowerCase()) || 
                          (f.status === 'success' && generateFileName(f).toLowerCase().includes(search.toLowerCase()));
    
    let matchesDate = true;
    const dateValue = f.fieldValues['date']; // Assuming 'date' is the field ID for date
    
    if (dateValue && (startDate || endDate)) {
      try {
        const parts = dateValue.split('-');
        if (parts.length === 3) {
          // DD-MM-YYYY
          const fileDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
          
          if (startDate) {
            const start = new Date(startDate + 'T00:00:00');
            if (fileDate < start) matchesDate = false;
          }
          
          if (endDate) {
            const end = new Date(endDate + 'T23:59:59');
            if (fileDate > end) matchesDate = false;
          }
        }
      } catch (e) {
        console.error("Error parsing file date:", e);
      }
    } else if ((startDate || endDate) && !dateValue) {
      // If filtering by date but file has no date, exclude it
      matchesDate = false;
    }

    return matchesFilter && matchesSearch && matchesDate;
  });

  const successCount = files.filter(f => !f.trash && f.status === 'success').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="px-2 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          {userName && (
            <p className="text-blue-600 font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
              {t.welcome} {userName}
            </p>
          )}
          <h2 className="text-3xl font-black font-display tracking-tight mb-2">{t.reports.title}</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t.reports.subtitle}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className={`flex flex-col gap-1 px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <label className="text-[8px] font-black uppercase text-slate-500">{t.reports.startDate}</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[10px] font-bold p-0"
              />
            </div>
            
            <div className={`flex flex-col gap-1 px-3 py-1.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <label className="text-[8px] font-black uppercase text-slate-500">{t.reports.endDate}</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[10px] font-bold p-0"
              />
            </div>

            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <FileSearch className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder={t.reports.searchFile}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-40 md:w-32"
              />
            </div>

            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold shadow-sm transition-all ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-700'}`}
            >
              <option value="all">{t.reports.all}</option>
              <option value="success">{t.successBadge}</option>
              <option value="error">{t.failBadge}</option>
              <option value="pending">{t.pendingBadge}</option>
            </select>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto lg:ml-auto">
            <button 
              onClick={onGenerateReport}
              disabled={files.filter(f => !f.trash).length === 0}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white font-bold text-xs shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              {t.genReport}
            </button>

            <button 
              onClick={onDownloadAllZip}
              disabled={isZipping || successCount === 0}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-lg shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {t.downloadZip}
            </button>
          </div>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
        <table className="w-full text-left border-collapse min-w-[600px] md:min-w-0">
          <thead>
            <tr className={`border-b ${theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50/50 border-slate-100'}`}>
              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Arquivo Original</th>
              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-500 whitespace-nowrap">Resultado</th>
              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-center whitespace-nowrap">Status</th>
              <th className="px-4 md:px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <tr key={file.id} className="hover:bg-slate-50/10 transition-colors group">
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                      <span className="text-xs font-bold truncate max-w-[120px] sm:max-w-[200px]">{file.file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <span className="text-xs font-medium opacity-70 italic truncate max-w-[150px] sm:max-w-[250px] inline-block">
                      {file.status === 'success' ? generateFileName(file) : '-'}
                    </span>
                  </td>
                  <td className="px-4 md:px-6 py-4">
                    <div className="flex justify-center">
                      <StatusBadge status={file.status} step={file.step} error={file.errorMessage} t={t} />
                    </div>
                  </td>
                  <td className="px-4 md:px-6 py-4 text-right">
                    {file.status === 'success' && (
                      <button 
                        onClick={() => onDownload(file)}
                        className="p-2 rounded-xl bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-slate-400 font-bold text-sm italic">
                  {t.reports.noResults}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminView({ 
  t, 
  theme, 
  users, 
  allPlanSettings, 
  onSearchUsers, 
  userSearch, 
  onUpdateUserPlan, 
  onUpdatePlanPrice,
  isLoading
}: { 
  t: any, 
  theme: string, 
  users: UserProfileWithId[], 
  allPlanSettings: Record<string, FirebasePlanSettings>,
  onSearchUsers: (query: string) => void,
  userSearch: string,
  onUpdateUserPlan: (userId: string, plan: 'free' | 'basico' | 'pro' | 'enterprise') => void,
  onUpdatePlanPrice: (plan: string, price: string) => void,
  isLoading: boolean
}) {
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [tempPrices, setTempPrices] = useState({
    free: allPlanSettings.free?.price || '',
    basico: allPlanSettings.basico?.price || '',
    pro: allPlanSettings.pro?.price || '',
    enterprise: allPlanSettings.enterprise?.price || ''
  });

  const handleSavePrices = () => {
    Object.entries(tempPrices).forEach(([plan, price]) => {
      onUpdatePlanPrice(plan, price as string);
    });
    setIsEditingPrices(false);
  };

  const parsePrice = (priceStr: string) => {
    if (!priceStr) return 0;
    const matches = priceStr.match(/(\d+([.,]\d+)?)/);
    if (matches) {
      return parseFloat(matches[0].replace(',', '.'));
    }
    return 0;
  };

  const lang = t.title === 'TNA DIGITAL OCR' ? 'pt' : 'en';

  const planStats = {
    free: users.filter(u => u.plan === 'free').length,
    basico: users.filter(u => u.plan === 'basico').length,
    pro: users.filter(u => u.plan === 'pro').length,
    enterprise: users.filter(u => u.plan === 'enterprise').length
  };

  const totalRevenue = users.reduce((acc, u) => {
    if (u.plan === 'free') return acc;
    const price = parsePrice(allPlanSettings[u.plan]?.price || '0');
    return acc + price;
  }, 0);

  const activeCompaniesCount = users.filter(u => u.usageCount > 0).length;
  const averageUsagePerCompany = activeCompaniesCount > 0 
    ? (users.reduce((acc, u) => acc + (u.usageCount || 0), 0) / activeCompaniesCount).toFixed(1)
    : 0;

  const chartData = [
    { name: t.planFree, value: planStats.free, color: '#94a3b8' },
    { name: t.planBasico, value: planStats.basico, color: '#10b981' },
    { name: t.planPro, value: planStats.pro, color: '#f59e0b' },
    { name: t.planEnterprise, value: planStats.enterprise, color: '#2563eb' }
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="px-2 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black font-display tracking-tight mb-2">{t.adminDashboard}</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">{t.manageCompanies}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
            <FileSearch className="w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={t.searchUsers}
              value={userSearch}
              onChange={(e) => onSearchUsers((e.target as HTMLInputElement).value)}
              className="bg-transparent border-none focus:ring-0 text-xs font-bold w-48"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Carregando dados das empresas...</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-600 mb-3">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.activeCompanies}</p>
              <p className="text-2xl font-black text-blue-600">{activeCompaniesCount}</p>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-600/10 flex items-center justify-center text-emerald-600 mb-3">
                <CreditCard className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.mrrLabel}</p>
              <p className="text-2xl font-black text-emerald-500">
                {new Intl.NumberFormat(lang === 'pt' ? 'pt-BR' : 'en-US', { style: 'currency', currency: lang === 'pt' ? 'BRL' : 'USD' }).format(totalRevenue)}
              </p>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="w-8 h-8 rounded-lg bg-amber-600/10 flex items-center justify-center text-amber-600 mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.averageUsage}</p>
              <p className="text-2xl font-black text-amber-500">{averageUsagePerCompany}</p>
            </div>
            <div className={`p-6 rounded-[2rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="w-8 h-8 rounded-lg bg-indigo-600/10 flex items-center justify-center text-indigo-600 mb-3">
                <User className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">{t.totalUsers}</p>
              <p className="text-2xl font-black text-indigo-600">{users.length}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <h3 className="text-lg font-black font-display mb-6">{t.planDistribution}</h3>
              <div className="h-[250px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold text-sm italic">
                    {t.dashboard.noData}
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2">
                {chartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] font-bold uppercase text-slate-500">{d.name}: {d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-black font-display">{t.editPrices}</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{t.plansTitle}</p>
                </div>
                <button 
                  onClick={() => {
                    if (!isEditingPrices) {
                      setTempPrices({
                        free: allPlanSettings.free?.price || '',
                        pro: allPlanSettings.pro?.price || '',
                        enterprise: allPlanSettings.enterprise?.price || ''
                      });
                    }
                    setIsEditingPrices(!isEditingPrices);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${isEditingPrices ? 'bg-slate-200 text-slate-600' : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'}`}
                >
                  {isEditingPrices ? t.close : t.editPrices}
                </button>
              </div>

              {isEditingPrices ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['free', 'pro', 'enterprise'].map((p) => (
                      <div key={p}>
                        <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">{p}</label>
                        <input 
                          type="text" 
                          value={(tempPrices as any)[p]}
                          onChange={(e) => setTempPrices(prev => ({ ...prev, [p]: e.target.value }))}
                          className={`w-full px-4 py-2 rounded-xl border text-xs font-bold ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'}`}
                        />
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={handleSavePrices}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-xs shadow-lg shadow-blue-500/20"
                  >
                    {t.savePrices}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {['free', 'basico', 'pro', 'enterprise'].map((p) => (
                    <div key={p} className="flex flex-col">
                      <span className="text-[9px] font-black uppercase text-slate-400">{p}</span>
                      <span className="text-sm font-bold">{allPlanSettings[p]?.price || '-'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className={`overflow-hidden rounded-[2.5rem] border ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100 shadow-sm'}`}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'} border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'}`}>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.profile}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-center">{t.usageLabel}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-center">{t.planValue}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500">{t.plansTitle}</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase text-slate-500 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          {(u.displayName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold truncate">{u.displayName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-sm font-mono font-bold ${u.usageCount >= (PLAN_LIMITS[u.plan as keyof typeof PLAN_LIMITS] || 10) && !u.geminiApiKey ? 'text-red-500' : 'text-blue-500'}`}>
                        {u.usageCount || 0}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1">/ {u.geminiApiKey ? '∞' : (PLAN_LIMITS[u.plan as keyof typeof PLAN_LIMITS] || 10)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-black text-slate-600">
                        {allPlanSettings[u.plan]?.price || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <select 
                          value={u.plan}
                          onChange={(e) => onUpdateUserPlan(u.id, e.target.value as any)}
                          className={`bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-wider cursor-pointer ${u.plan === 'pro' ? 'text-amber-500' : u.plan === 'enterprise' ? 'text-blue-500' : u.plan === 'basico' ? 'text-emerald-500' : 'text-slate-500'}`}
                        >
                          <option value="free">FREE</option>
                          <option value="basico">BASICO</option>
                          <option value="pro">PRO</option>
                          <option value="enterprise">ENTERPRISE</option>
                        </select>
                        <div className="flex items-center gap-1">
                          <Crown className={`w-3 h-3 ${(u.email === 'contatotnadigital@gmail.com' || u.email === 'sistematna@gmail.com') ? 'text-amber-500' : 'text-slate-300'}`} />
                          <span className={`text-[8px] font-black uppercase tracking-wider ${(u.email === 'contatotnadigital@gmail.com' || u.email === 'sistematna@gmail.com') ? 'text-amber-500' : 'text-slate-400'}`}>
                            {(u.email === 'contatotnadigital@gmail.com' || u.email === 'sistematna@gmail.com') ? t.roleSuper : t.roleUser}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onUpdateUserPlan(u.id, u.plan === 'free' ? 'pro' : 'free')}
                        className={`p-2 rounded-xl transition-all ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} hover:bg-blue-600 hover:text-white`}
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}


