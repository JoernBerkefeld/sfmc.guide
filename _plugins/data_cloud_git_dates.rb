require 'open3'
require 'time'

module DataCloudGitDates
  PREFIX = 'next/data-cloud-cli/'.freeze

  def self.last_commit(source, path)
    output, status = Open3.capture2e('git', '-C', source, 'log', '-1', '--format=%cI', '--', path)
    return nil unless status.success? && !output.strip.empty?

    Time.iso8601(output.strip).utc.iso8601
  rescue Errno::ENOENT, ArgumentError
    nil
  end
end

Jekyll::Hooks.register :site, :post_read do |site|
  site.pages.each do |page|
    next unless page.path.start_with?(DataCloudGitDates::PREFIX) && File.dirname(page.path) == 'next/data-cloud-cli' && File.extname(page.path) == '.md'

    page.data['data_cloud_git_date'] = DataCloudGitDates.last_commit(site.source, page.path)
    page.data['data_cloud_git_date_scoped'] = true
  end
end
