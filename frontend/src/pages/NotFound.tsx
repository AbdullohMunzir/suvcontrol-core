import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handleHomeClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (role === 'SUPERADMIN') {
      navigate('/superadmin/dashboard');
    } else {
      navigate('/app/dashboard');
    }
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Result
        status="404"
        title={<span className="text-4xl font-bold text-slate-800">404</span>}
        subTitle={<span className="text-lg text-slate-600">Kechirasiz, siz qidirayotgan sahifa topilmadi yoki ko'chirilgan bo'lishi mumkin.</span>}
        icon={
          <svg className="w-48 h-48 mx-auto text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        }
        extra={
          <div className="space-x-4">
            <Button
              type="primary"
              size="large"
              icon={<HomeOutlined />}
              onClick={handleHomeClick}
              className="bg-sky-600 hover:bg-sky-700 border-none"
            >
              {isAuthenticated ? 'Boshqaruv paneliga qaytish' : 'Kirish sahifasiga qaytish'}
            </Button>
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={handleGoBack}
            >
              Oldingi sahifaga qaytish
            </Button>
          </div>
        }
      />
    </div>
  );
};

export default NotFound;
