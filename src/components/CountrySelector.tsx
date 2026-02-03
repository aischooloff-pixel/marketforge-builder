import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { countries, services } from '@/data/products';
import { Check } from 'lucide-react';
import { ServiceIcon } from './ServiceIcons';

interface CountrySelectorProps {
  selectedCountry: string | null;
  onSelect: (code: string) => void;
  availableCountries?: string[];
  showLatency?: boolean;
}

export const CountrySelector = ({ 
  selectedCountry, 
  onSelect, 
  availableCountries,
  showLatency = true 
}: CountrySelectorProps) => {
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);

  const filteredCountries = availableCountries 
    ? countries.filter(c => availableCountries.includes(c.code))
    : countries;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Выберите страну</label>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 relative">
        {filteredCountries.map((country) => (
          <motion.button
            key={country.code}
            onClick={() => onSelect(country.code)}
            onMouseEnter={() => setHoveredCountry(country.code)}
            onMouseLeave={() => setHoveredCountry(null)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`relative p-3 rounded-lg border transition-all ${
              selectedCountry === country.code
                ? 'border-foreground bg-secondary'
                : 'border-border hover:border-foreground/50'
            } ${!country.available ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={!country.available}
          >
            <span className="text-2xl">{country.flag}</span>
            {selectedCountry === country.code && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center"
              >
                <Check className="h-3 w-3" />
              </motion.div>
            )}

            {/* Tooltip on hover */}
            <AnimatePresence>
              {hoveredCountry === country.code && showLatency && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
                >
                  <div className="bg-popover border rounded-lg shadow-lg p-3 whitespace-nowrap">
                    <p className="font-medium text-sm">{country.name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${
                        country.latency < 50 ? 'bg-green-500' :
                        country.latency < 100 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                      <span>{country.latency}ms</span>
                      <span className={country.available ? 'text-green-600' : 'text-red-600'}>
                        {country.available ? 'Доступно' : 'Недоступно'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </div>
      {selectedCountry && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-secondary"
        >
          <span className="text-xl">
            {countries.find(c => c.code === selectedCountry)?.flag}
          </span>
          <span className="font-medium">
            {countries.find(c => c.code === selectedCountry)?.name}
          </span>
        </motion.div>
      )}
    </div>
  );
};

interface ServiceSelectorProps {
  selectedServices: string[];
  onToggle: (serviceId: string) => void;
  availableServices?: string[];
}

export const ServiceSelector = ({ 
  selectedServices, 
  onToggle,
  availableServices 
}: ServiceSelectorProps) => {
  const filteredServices = availableServices
    ? services.filter(s => availableServices.includes(s.id))
    : services;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Поддерживаемые сервисы</label>
      <p className="text-xs text-muted-foreground">
        Только для легальной верификации и тестирования
      </p>
      <div className="flex flex-wrap gap-2">
        {filteredServices.map((service) => (
          <motion.button
            key={service.id}
            onClick={() => onToggle(service.id)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${
              selectedServices.includes(service.id)
                ? 'border-foreground bg-foreground text-background'
                : 'border-border hover:border-foreground/50'
            }`}
          >
            <ServiceIcon serviceId={service.id} className="h-5 w-5" />
            <span className="text-sm font-medium">{service.name}</span>
            {selectedServices.includes(service.id) && (
              <Check className="h-4 w-4" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};
